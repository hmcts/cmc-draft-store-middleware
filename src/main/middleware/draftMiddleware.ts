import * as express from 'express'
import * as moment from 'moment'

import { Draft, DraftService, Secrets } from '@hmcts/draft-store-client'

import { DraftDocument } from '..'

import { UUIDUtils } from '../utils/uuidUtils'

/**
 * Filters list of drafts to return only these matching external ID. If none of the drafts has external ID set
 * then unchanged list is returned so that they can be migrated to new format with external ID (legacy drafts scenario).
 */
function filterByExternalId<T extends DraftDocument> (drafts: Draft<T>[], externalId: string): Draft<T>[] {
  if (drafts.filter(draft => draft.document.externalId !== undefined).length === 0) {
    return drafts
  }

  return drafts.filter(item => item.document.externalId === externalId)
}

/**
 * Checks whether draft (optional) has an external ID or not
 */
function draftIsMissingExternalId<T extends DraftDocument> (draft: Draft<T>): boolean {
  return draft.document !== undefined && draft.document.externalId === undefined
}

export class DraftMiddleware {

  static requestHandler<T extends DraftDocument> (
    draftService: DraftService,
    draftType: string,
    limit: number,
    deserializeFn: (value: any) => T = (value) => value,
    secrets?: Secrets
  ): express.RequestHandler {

    return async function (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
      if (res.locals.isLoggedIn) {
        try {
          let drafts = await draftService.find(
            draftType,
            limit.toString(),
            res.locals.user.bearerToken,
            deserializeFn,
            secrets
          )

          // req.params isn't populated here https://github.com/expressjs/express/issues/2088
          const externalId: string | undefined = UUIDUtils.extractFrom(req.path)

          if (externalId !== undefined) {
            drafts = filterByExternalId(drafts, externalId)
          }

          let draft: Draft<T> = !drafts.length
            ? new Draft<T>(0, draftType, deserializeFn(undefined), moment(), moment())
            : drafts[0]
          if (drafts.length > 1) {
            // just use the latest
            for (let i = 1; i < drafts.length; i++) {
              if (draft.updated.isBefore(drafts[i].updated)) {
                draft = drafts[i]
              }
            }
          }

          if (draftIsMissingExternalId(draft) && externalId !== undefined) {
            draft.document.externalId = externalId
          }
          res.locals[`${draftType}Draft`] = draft

          next()
        } catch (err) {
          next(err)
        }
      } else {
        next()
      }
    }
  }
}

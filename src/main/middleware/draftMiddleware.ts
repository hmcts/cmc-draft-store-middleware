import * as express from 'express'
import * as moment from 'moment'

import { Draft } from '@hmcts/draft-store-client/dist/draft/draft'
import { DraftService } from '@hmcts/draft-store-client/dist/draft/draftService'

import { DraftDocument } from '../model/draftDocument'

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

  static requestHandler<T extends DraftDocument> (draftService: DraftService, draftType: string, limit: number, deserializeFn: (value: any) => T = (value) => value): express.RequestHandler {
    return async function (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
      if (res.locals.isLoggedIn) {
        try {
          let drafts = await draftService.find(draftType, limit.toString(), res.locals.user.bearerToken, deserializeFn)

          // req.params isn't populated here https://github.com/expressjs/express/issues/2088
          const externalId: string | undefined = UUIDUtils.extractFrom(req.path)

          if (externalId !== undefined) {
            drafts = filterByExternalId(drafts, externalId)
          }

          if (drafts.length > 1) {
            throw new Error('More then one draft has been found')
          }

          let draft: Draft<T>
          if (drafts.length === 1) {
            draft = drafts[0]
          } else {
            draft = new Draft<T>(0, draftType, deserializeFn(undefined), moment(), moment())
          }

          if (draftIsMissingExternalId(draft) && externalId !== undefined) {
            draft.document.externalId = externalId
          }
          res.locals.user[`${draftType}Draft`] = draft

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

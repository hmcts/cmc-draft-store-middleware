/* tslint:disable:no-unused-expression */
import * as express from 'express'
import * as chai from 'chai'
import * as spies from 'sinon-chai'
import * as sinon from 'sinon'
import { mockReq, mockRes } from 'sinon-express-mock'

import { DraftMiddleware } from '../../main/middleware/draftMiddleware'

import { DraftService } from '@hmcts/draft-store-client/dist/draft/draftService'
import { DraftDocument } from '../../main/model/draftDocument'
import { Draft } from '@hmcts/draft-store-client/dist/draft/draft'
import moment = require('moment')

chai.use(spies)

describe('Draft middleware', () => {
  describe('request handler', () => {
    let draftService: DraftService
    let req: express.Request
    let next: express.NextFunction

    beforeEach(() => {
      draftService = sinon.createStubInstance(DraftService)

      req = mockReq()
      req.path = '/claim/start'

      next = sinon.spy()
    })

    afterEach(() => {
      sinon.restore(draftService)
    })

    it('should search for drafts if the user is logged in', async () => {
      const res: express.Response = mockRes()
      res.locals.isLoggedIn = true
      res.locals.user = {
        bearerToken: 'user-jwt-token'
      }

      draftService.find['returns'](Promise.resolve([
        new Draft(1, 'default', new DraftDocument(), moment(), moment())
      ]))

      await DraftMiddleware.requestHandler(draftService,'default', 100)(req, res, next)
      chai.expect(draftService.find).to.have.been.called
      chai.expect(next).to.have.been.called.called
    })
    
    it('should not search for drafts if the user is not logged in', async () => {
      const res: express.Response = mockRes()
      res.locals.isLoggedIn = false

      await DraftMiddleware.requestHandler(draftService,'default', 100)(req, res, next)
      chai.expect(draftService.find).to.not.have.been.called
      chai.expect(next).to.have.been.called
    })

    it('should not search for drafts if the isLoggedIn flag is not defined', async () => {
      const res: express.Response = mockRes()
      res.locals.isLoggedIn = undefined

      await DraftMiddleware.requestHandler(draftService,'default', 100)(req, res, next)
      chai.expect(draftService.find).to.not.have.been.called
      chai.expect(next).to.have.been.called
    })
  })
})

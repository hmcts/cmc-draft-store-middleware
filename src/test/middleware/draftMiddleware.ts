/* tslint:disable:no-unused-expression */
import * as express from 'express'
import * as chai from 'chai'
import * as spies from 'sinon-chai'
import * as sinon from 'sinon'
import { SinonSpy, SinonStubbedInstance } from 'sinon'
import { mockReq, mockRes } from 'sinon-express-mock'

import { DraftMiddleware } from '../../main/middleware/draftMiddleware'

import { DraftService } from '@hmcts/draft-store-client/dist/draft/draftService'
import { DraftDocument } from '../../main/model/draftDocument'
import { Draft } from '@hmcts/draft-store-client/dist/draft/draft'
import moment = require('moment')

chai.use(spies)

function newDraftDocument (externalId?: string): DraftDocument {
  const draftDocument = new DraftDocument()
  draftDocument.externalId = externalId
  return draftDocument
}

describe('Draft middleware', () => {
  describe('request handler', () => {
    let draftService: SinonStubbedInstance<DraftService>
    let req: express.Request
    let res: express.Response
    let next: SinonSpy

    beforeEach(() => {
      draftService = sinon.createStubInstance(DraftService)
      req = mockReq()
      req.path = '/claim/start'
      res = mockRes()
      next = sinon.spy()
    })

    afterEach(() => {
      sinon.restore(draftService)
    })

    describe('when used is not logged in', () => {
      [false, undefined].forEach(value => {
        it(`should not search for drafts when isLoggedIn flag is set to ${value}`, async () => {
          res.locals.isLoggedIn = value

          await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
          chai.expect(draftService.find).to.not.have.been.called
          chai.expect(next).to.have.been.calledOnce
          chai.expect(next.firstCall.args).to.be.empty
        })
      })
    })

    describe('when used is logged in', () => {
      beforeEach(() => {
        res.locals.isLoggedIn = true
        res.locals.user = {
          bearerToken: 'user-jwt-token'
        }
      })

      it('should set empty draft in user local scope when no draft is found', async () => {
        draftService.find.returns(Promise.resolve([]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.user.defaultDraft).to.be.instanceof(Draft)
        chai.expect(res.locals.user.defaultDraft.id).to.be.equal(0)
        chai.expect(res.locals.user.defaultDraft.type).to.be.equal('default')
        chai.expect(res.locals.user.defaultDraft.document).to.be.undefined
        chai.expect(res.locals.user.defaultDraft.created).to.be.not.undefined
        chai.expect(res.locals.user.defaultDraft.updated).to.be.not.undefined
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.empty
      })

      it('should set empty draft in user local scope when draft external ID does not match the one extracted from path', async () => {
        req.path = '/response/cec85062-8df0-4bcb-a1c5-b8b91e78a1d5/start'

        draftService.find.returns(Promise.resolve([
          new Draft(1, 'default', newDraftDocument('27aed150-1948-4130-83ff-147c0b62f53c'), moment(), moment())
        ]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.user.defaultDraft).to.be.instanceof(Draft)
        chai.expect(res.locals.user.defaultDraft.id).to.be.equal(0)
        chai.expect(res.locals.user.defaultDraft.type).to.be.equal('default')
        chai.expect(res.locals.user.defaultDraft.document).to.be.undefined
        chai.expect(res.locals.user.defaultDraft.created).to.be.not.undefined
        chai.expect(res.locals.user.defaultDraft.updated).to.be.not.undefined
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.empty
      })

      it('should set retrieved draft in user local scope when draft is found', async () => {
        const draft = new Draft(1, 'default', newDraftDocument(), moment(), moment())
        draftService.find.returns(Promise.resolve([draft]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.user.defaultDraft).to.be.equal(draft)
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.empty
      })

      it('should pass to the next middleware with error when more then one draft is found', async () => {
        draftService.find.returns(Promise.resolve([
          new Draft(1, 'default', newDraftDocument(), moment(), moment()),
          new Draft(2, 'default', newDraftDocument(), moment(), moment())
        ]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.user.defaultDraft).to.be.undefined
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.lengthOf(1)
        chai.expect(next.firstCall.args[0]).to.be.instanceof(Error)
          .with.property('message').to.be.equal('More then one draft has been found')
      })
    })
  })
})

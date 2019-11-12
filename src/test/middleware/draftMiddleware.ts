/* tslint:disable:no-unused-expression */
import * as express from 'express'
import * as chai from 'chai'
import * as spies from 'sinon-chai'
import * as sinon from 'sinon'
import { mockReq, mockRes } from 'sinon-express-mock'

import { DraftMiddleware } from '../../main/middleware/draftMiddleware'

import { DraftService, Draft, Secrets } from '@hmcts/draft-store-client'
import { DraftDocument } from '../../main/model/draftDocument'
import moment = require('moment')

chai.use(spies)

function newDraftDocument (externalId?: string): DraftDocument {
  const draftDocument = new DraftDocument()
  draftDocument.externalId = externalId
  return draftDocument
}

describe('Draft middleware', () => {
  describe('request handler', () => {
    let draftService: sinon.SinonStubbedInstance<DraftService>
    let req: express.Request
    let res: express.Response
    let next: sinon.SinonSpy

    beforeEach(() => {
      draftService = sinon.createStubInstance(DraftService)
      req = mockReq()
      req.path = '/claim/start'
      res = mockRes()
      next = sinon.spy()
    })

    afterEach(() => {
      Object.values(draftService).forEach(stub => {
        stub.restore()
      })
    })

    describe('when user is not logged in', () => {
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

    describe('when user is logged in', () => {
      beforeEach(() => {
        res.locals.isLoggedIn = true
        res.locals.user = {
          bearerToken: 'user-jwt-token'
        }
      })

      it('should set empty draft in user local scope when no draft is found', async () => {
        draftService.find.returns(Promise.resolve([]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.defaultDraft).to.be.instanceof(Draft)
        chai.expect(res.locals.defaultDraft.id).to.be.equal(0)
        chai.expect(res.locals.defaultDraft.type).to.be.equal('default')
        chai.expect(res.locals.defaultDraft.document).to.be.undefined
        chai.expect(res.locals.defaultDraft.created).to.be.not.undefined
        chai.expect(res.locals.defaultDraft.updated).to.be.not.undefined
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.empty
      })

      it('should set empty draft in user local scope when draft external ID does not match the one extracted from path', async () => {
        req.path = '/response/cec85062-8df0-4bcb-a1c5-b8b91e78a1d5/start'

        draftService.find.returns(Promise.resolve([
          new Draft(1, 'default', newDraftDocument('27aed150-1948-4130-83ff-147c0b62f53c'), moment(), moment())
        ]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.defaultDraft).to.be.instanceof(Draft)
        chai.expect(res.locals.defaultDraft.id).to.be.equal(0)
        chai.expect(res.locals.defaultDraft.type).to.be.equal('default')
        chai.expect(res.locals.defaultDraft.document).to.be.undefined
        chai.expect(res.locals.defaultDraft.created).to.be.not.undefined
        chai.expect(res.locals.defaultDraft.updated).to.be.not.undefined
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.empty
      })

      it('should set retrieved draft in user local scope when draft is found', async () => {
        const draft = new Draft(1, 'default', newDraftDocument(), moment(), moment())
        draftService.find.returns(Promise.resolve([draft]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.defaultDraft).to.be.equal(draft)
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.empty
      })

      it('should set latest retrieved draft in user local scope when more than one draft is found', async () => {
        let oldDraft = new Draft(1, 'default', newDraftDocument(),
          moment().subtract(2, 'days'), moment().subtract(1, 'day'))
        let latestDraft = new Draft(2, 'default', newDraftDocument(), moment(), moment())
        draftService.find.returns(Promise.resolve([ oldDraft, latestDraft ]))

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100)(req, res, next)
        chai.expect(res.locals.defaultDraft).to.be.equal(latestDraft)
        chai.expect(next).to.have.been.calledOnce
        chai.expect(next.firstCall.args).to.be.empty
      })

      it('should use encryption secrets when they are provided', async () => {
        const secrets = new Secrets('primary', 'secondary')

        await DraftMiddleware.requestHandler(draftService as any, 'default', 100, doc => doc, secrets)(req, res, next)

        chai.expect(draftService.find).to.have.been.calledWith(
          sinon.match.any,
          sinon.match.any,
          sinon.match.any,
          sinon.match.any,
          secrets
        )
      })
    })
  })
})

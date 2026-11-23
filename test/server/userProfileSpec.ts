/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import sinon from 'sinon'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { getUserProfile } from '../../routes/userProfile'
import { UserModel } from '../../models/user'
import * as security from '../../lib/insecurity'
import * as utils from '../../lib/utils'

const expect = chai.expect
chai.use(sinonChai)

describe('userProfile', () => {
  let req: any
  let res: any
  let next: any
  let user: UserModel

  beforeEach(() => {
    req = { cookies: { token: 'profile-test' }, socket: {}, app: { locals: {} } }
    res = { set: sinon.spy(), send: sinon.spy() }
    next = sinon.spy()
    user = {
      username: 'Localhorst',
      email: 'user@example.com',
      profileImage: '/assets/public/images/uploads/default.svg'
    } as unknown as UserModel
    sinon.stub(security.authenticatedUsers, 'get').returns({ data: { id: 1 } } as any)
    sinon.stub(UserModel, 'findByPk').resolves(user)
    sinon.stub(utils, 'isChallengeEnabled').returns(true)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('renders the username and existing profile fields', async () => {
    await getUserProfile()(req, res, next)

    expect(next).to.have.callCount(0)
    expect(res.send).to.have.callCount(1)
    const html = res.send.firstCall.args[0]
    expect(html).to.contain('>Localhorst</p>')
    expect(html).to.contain('value="user@example.com"')
    expect(html).to.contain('value="Localhorst"')
    expect(res.set).to.have.callCount(1)
  })

  for (const username of [
    '#{req.app.locals.executed = true}',
    'prefix #{req.app.locals.executed = true}',
    '!{req.app.locals.executed = true}',
    'test\n- req.app.locals.executed = true',
    '\\#{req.app.locals.executed = true}',
    '#{1 + 1}',
    '_username_ _emailHash_ _title_ $&'
  ]) {
    it(`renders ${JSON.stringify(username)} as data without evaluating it`, async () => {
      user.username = username

      await getUserProfile()(req, res, next)

      expect(next).to.have.callCount(0)
      expect(res.send).to.have.callCount(1)
      expect(res.send.firstCall.args[0]).to.contain(`>${username}</p>`)
      expect(req.app.locals).to.deep.equal({})
    })
  }

  for (const username of ['', undefined]) {
    it(`renders an empty username for ${JSON.stringify(username)}`, async () => {
      user.username = username

      await getUserProfile()(req, res, next)

      expect(next).to.have.callCount(0)
      expect(res.send).to.have.callCount(1)
      expect(res.send.firstCall.args[0]).not.to.contain('_username_')
      expect(res.send.firstCall.args[0]).not.to.contain('undefined')
    })
  }
})

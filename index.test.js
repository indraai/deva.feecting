"use strict"
// ©2025 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:65694000411453431436 LICENSE.md
// Feecting Deva test file

const {expect} = require('chai')
const feecting = require('./index.js');

describe(feecting.me.name, () => {
  beforeEach(() => {
    return feecting.init()
  });
  it('Check the SVARGA Object', () => {
    expect(feecting).to.be.an('object');
    expect(feecting).to.have.property('me');
    expect(feecting).to.have.property('vars');
    expect(feecting).to.have.property('listeners');
    expect(feecting).to.have.property('methods');
    expect(feecting).to.have.property('modules');
  });
})

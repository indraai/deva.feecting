"use strict"
// Copyright ©2000-2025 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:52583635952527737176 LICENSE.md
// Saturday, November 22, 2025 - 9:51:12 AM

// Feecting Deva test file

const {expect} = require('chai')
const FeectingDeva = require('./index.js');

describe(FeectingDeva.me.name, () => {
  beforeEach(() => {
    return FeectingDeva.init()
  });
  it('Check the SVARGA Object', () => {
    expect(FeectingDeva).to.be.an('object');
    expect(FeectingDeva).to.have.property('me');
    expect(FeectingDeva).to.have.property('vars');
    expect(FeectingDeva).to.have.property('listeners');
    expect(FeectingDeva).to.have.property('methods');
    expect(FeectingDeva).to.have.property('modules');
  });
})

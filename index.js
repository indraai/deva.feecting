"use strict"
// Copyright ©2025 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:65859204002504361305 LICENSE.md
// The Feecting Deva

import Deva from '@indra.ai/deva';
import needle from 'needle';
import pkg from './package.json' with {type:'json'};
const {agent, vars} = pkg.data;

// set the __dirname
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';    
const __dirname = dirname(fileURLToPath(import.meta.url));

const info = {
  id: pkg.id,
  name: pkg.name,
  describe: pkg.description,
  version: pkg.version,
  dir: __dirname,
  url: pkg.homepage,
  git: pkg.repository.url,
  bugs: pkg.bugs.url,
  author: pkg.author,
  license: pkg.license,
  VLA: pkg.VLA,
  copyright: pkg.copyright,
};

import parse from './_parse.js';
const FEECTING = new Deva({
  info,
  agent,
  vars,
  utils: {
    translate(input) {return input.trim();},
    parse,
    process(input) {return input.trim();},
  },
  listeners: {},
  func: {
    /***********
      func: talk
      params: j - the talk events to process
      describe: the talk function takes parsed data and looks for any talk
                events to speak. If there are talk events it calls the talker
                function next.
    ***********/
    tasks(t) {
      this.action('func', 'tasks');
      // here we need to put the talk events into the local variables with push
      return new Promise((resolve, reject) => {
        if (!t) return reject(this.vars.messages.no_tasks);
        if (!t.data.talk.length) return resolve(t);
        t.pending = this.lib.copy(t.data.talk);
        t.pending.complete = false;
        this.vars.jobs[t.data.id] = this.lib.copy(t);
        this.vars.talking = true;
        this.func.processor(t.data.id).then(job => {
          return resolve(job);
        }).catch(reject);
      });
    },
    /***********
      func: talker
      params: jobid - the job id to work
      describe: talker object iterates through talk events in the pending array.
    ***********/
    processor(jobid) {
      this.action('func', 'processor');
      return new Promise((resolve, reject) => {
        // now that we have a job let's run the talk events for that job.
        const job = this.vars.jobs[jobid];
        if (!job.pending.length) {
          delete this.vars.jobs[jobid];
          return resolve(job);
        }
        let timeout = 0
        job.data.talk.forEach(j => {
          timeout = timeout + 10;
          setTimeout(() => {
            this.question(j.value).then(answer => {
              if (!answer.a.text) answer.a.text = '';
              if (!answer.a.html) answer.a.html = '';
              job.text = job.text.replace(j.placeholder, answer.a.text);
              job.html = job.html.replace(j.placeholder, answer.a.html);
              const pidx = job.pending.findIndex(i => i.id === j.id);
              const pend = job.pending.splice(pidx, 1);
              if (!job.pending.length) {
                const complete = this.lib.copy(job);
                delete this.vars.jobs[jobid]; // delete job from jobs when done.
                return resolve(complete);
              }
            });
          }, timeout);
        })
      });
    },
    /**************
    func: get
    params: url
    describe: get the remote feecting script from the url.
    ***************/
    get(opts) {
      this.action('func', 'get');
      return new Promise((resolve, reject) => {
        needle('get', opts.q.text).then(result => {
          opts.q.meta.url = opts.q.text;
          opts.q.text = result.body;
          return this.func.parse(opts);
        }).then(parsed  => {
          return resolve(parsed);
        }).catch(err => {
          return this.error(err,opts,reject);
        });
      });
    }
  },
  methods: {
    /**************
    method: parse
    params: packet
    describe: Call the parse function for a string of text.
    ***************/
    parse(packet) {
      this.action('method', 'parse');
      return new Promise((resolve, reject) => {
        if (!packet) return resolve(this._messages.nopacket);
        if (!packet.q.text) return resolve(this._messages.nopacket);
        const parsed = this.utils.parse(this.lib.copy(packet));
        this.func.tasks(parsed).then(t => {
          return resolve(t);
        }).catch(err => {
          return this.error(err, packet, reject);
        })
      });
    },
    /**************
    method: get
    params: packet.q.text
    describe: get a remote feecting script using the web Devas.
    we need to look at this function because it relies on another deva let's use
    needle to get web requests.
    ***************/
    get(packet) {
      this.context('get');
      return this.func.get(packet);
    },
  },
  onInit(data, resolve) {
    const {personal} = this.license(); // get the license config
    const agent_license = this.info().VLA; // get agent license
    const license_check = this.license_check(personal, agent_license); // check license
    // return this.start if license_check passes otherwise stop.
    return license_check ? this.start(data, resolve) : this.stop(data, resolve);
  }, 
  onReady(data, resolve) {
    const {VLA} = this.info();
    this.prompt(`${this.vars.messages.ready} > VLA:${VLA.uid}`);
    return resolve(data);
  },
  onError(err, data, reject) {
    this.prompt(this.vars.messages.error);
    console.log(err);
    return reject(err);
  }
});
export default FEECTING

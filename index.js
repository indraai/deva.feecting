// Copyright (c)2023 Quinn Michaels
// The Feecting Deva

const fs = require('fs');
const path = require('path');

const package = require('./package.json');
const info = {
  name: package.name,
  version: package.version,
  author: package.author,
  describe: package.describe,
  url: package.homepage,
  git: package.repository.url,
  bugs: package.bugs.url,
  license: package.license,
  copyright: package.copyright
};

const data_path = path.join(__dirname, 'data.json');
const {agent,vars} = require(data_path).data;
const parse = require('./_parse.js');

const Deva = require('@indra.ai/deva');
const FEECTING = new Deva({
  info,
  agent: {
    id: agent.id,
    key: agent.key,
    prompt: agent.prompt,
    voice: agent.voice,
    profile: agent.profile,
    translate(input) {
      return input.trim();
    },
    parse,
  },
  vars,
  deva: {},
  listeners: {},
  modules: {},
  func: {

    /***********
      func: parse
      params: opts - the options to pass in for parsing.
      describe:
    ***********/
    parse(opts) {
      opts.id = opts.id || this.uid();
      return new Promise((resolve, reject) => {
        if (!opts) return reject('NO OPTS');
        if (!opts.q.text) return resolve(false);
        const parsed = this.agent.parse(opts);
        this.func.talk(parsed).then(talked => {
          return resolve(talked);
        }).catch(reject);
      });
    },

    /***********
      func: talk
      params: j - the talk events to process
      describe: the talk function takes parsed data and looks for any talk
                events to speak. If there are talk events it calls the talker
                function next.
    ***********/
    talk(t) {
      const { talker} = this.func;
      // here we need to put the talk events into the local variables with push
      return new Promise((resolve, reject) => {
        if (!t) return reject('NO TALK');
        if (!t.data.talk.length) return resolve(t);
        t.pending = this.lib.copy(t.data.talk);
        t.pending.complete = false;
        this.vars.jobs[t.data.id] = this.lib.copy(t);
        this.prompt(`TALK > ${t.data.id}`);
        this.vars.talking = true;
        talker(t.data.id).then(job => {
          return resolve(job);
        }).catch(reject);
      });
    },

    /***********
      func: talker
      params: jobid - the job id to work
      describe: talker object iterates through talk events in the pending array.
    ***********/
    talker(jobid) {
      return new Promise((resolve, reject) => {
        // now that we have a job let's run the talk events for that job.
        const job = this.vars.jobs[jobid];
        if (!job.pending.length) {
          delete this.vars.jobs[jobid];
          return resolve(job);
        }
        let timeout = 0
        job.data.talk.forEach(j => {
          this.prompt(`TALKER > ${j.value}`);
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
    func: read
    params: file
    describe: read a local feecting file
    ***************/
    read(file=false) {
      const id = this.uid();
      if (!file) file = 'main';
      file = file + '.feecting';
      return new Promise((resolve, reject) => {
        // now we want to get a feecting file
        try {
          const fct = path.join(__dirname, '..', '..', file);
          const fctRead = this.lib.feecting(fs.readFileSync(fct, 'utf8'));
          if (fctRead.events) fctRead.events.forEach(e => {
            e.text = e.text.replace(/:id:/g, `#Q${id}`)
            this.talk(e.name, {
              id,
              agent: this.agent,
              client: this.client,
              text: e.text,
              created: Date.now(),
            })
          })
          return resolve(fctRead.text);
        } catch (e) {
          return reject(e)
        }
      });
    },
    /**************
    func: get
    params: url
    describe: get the remote feecting script from the url.
    ***************/
    get(opts) {
      return new Promise((resolve, reject) => {
        this.question(`#web get ${opts.q.text}`).then(result => {
          opts.q.meta.url = opts.q.text;
          opts.q.text = result.a.text;
          const parsed = this.agent.parse(opts);
          return this.func.talk(parsed);
        }).then(talked  => {
          return resolve(talked);
        }).catch(err => {
          return this.error(err,opts,reject);
        });
      });
    }
  },
  methods: {
    /**************
    method: hash
    params: packet
    describe: Return hash from system function.
    ***************/
    hash(packet) {
      return this.hash(packet);
    },

    /**************
    method: read
    params: packet
    describe: Call the read function to read a feecting file
    ***************/
    read(packet) {
      return this.func.read(packet.q.text)
    },

    /**************
    method: parse
    params: packet
    describe: Call the parse function for a string of text.
    ***************/
    parse(packet) {
      return this.func.parse(packet);
    },

    /**************
    method: get
    params: packet.q.text
    describe: get a remoate feecting script using the web Devas.
    we need to look at this function because it relies on another deva let's use
    needle to get web requests.
    ***************/
    get(packet) {
      return this.func.get(packet);
    },

    /**************
    method: uid
    params: packet
    describe: Return system unique id.
    ***************/
    uid(packet) {
      return Promise.resolve(this.uid());
    },

    /**************
    method: status
    params: packet
    describe: Return Feecting Deva online status.
    ***************/
    status(packet) {
      return this.status();
    },

    /**************
    method: help
    params: packet
    describe: Return the Feecting Deva Help files.
    ***************/
    help(packet) {
      return new Promise((resolve, reject) => {
        this.lib.help(packet.q.text, __dirname).then(help => {
          return this.question(`/parse ${help}`);
        }).then(parsed => {
          return resolve({
            text: parsed.a.text,
            html: parsed.a.html,
            data: parsed.a.data,
          });
        }).catch(reject);
      });
    }
  },
});
module.exports = FEECTING

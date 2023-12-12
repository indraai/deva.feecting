// Copyright (c)2023 Quinn Michaels
// The Feecting Deva

const needle = require('needle');

const package = require('./package.json');
const info = {
  id: package.id,
  name: package.name,
  describe: package.description,
  version: package.version,
  dir: __dirname,
  url: package.homepage,
  git: package.repository.url,
  bugs: package.bugs.url,
  author: package.author,
  license: package.license,
  copyright: package.copyright,
};

const {agent,vars} = require('./data.json').DATA;

const Deva = require('@indra.ai/deva');
const FEECTING = new Deva({
  info,
  agent,
  vars,
  utils: {
    translate(input) {
      return input.trim();
    },
    parse: require('./_parse.js'),
    process(input) {
      return input.trim();
    },
  },
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
        t.pending = this.copy(t.data.talk);
        t.pending.complete = false;
        this.vars.jobs[t.data.id] = this.copy(t);
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
                const complete = this.copy(job);
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
        const parsed = this.utils.parse(this.copy(packet));
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
    describe: get a remoate feecting script using the web Devas.
    we need to look at this function because it relies on another deva let's use
    needle to get web requests.
    ***************/
    get(packet) {
      this.context('get');
      return this.func.get(packet);
    },
  },
  onError(err) {
    console.log('FEECTING ERROR', err);
  }
});
module.exports = FEECTING

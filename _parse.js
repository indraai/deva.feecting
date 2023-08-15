"use strict"
const fs = require('fs');
const path = require('path');
const basePath = path.join(__dirname, '..', '..');

function formatDate(d, format='long', time=false, locale='en-US') {
  if (!d) d = Date.now();
  d = new Date(d);

  const formats = {
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    long_month: { year: 'numeric', month: 'long', day: 'numeric'},
    short: { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' },
    short_month: { year: 'numeric', month: 'short', day: 'numeric' },
    year: { year: 'numeric' },
    month: { month: 'long' },
    day: { day: 'long' }
  };
  const theDate = d.toLocaleDateString(locale, formats[format]);
  const theTime = d.toLocaleTimeString(locale);

  if (format === 'time') return theTime;

  return !time ? theDate : `${theDate} - ${theTime}`;
}

class Parser {
  constructor(opts) {
    this.id = opts.id;
    this.key = opts.key;
    this.cmd = opts.cmd;
    this.params = opts.params;
    this.vars = opts.vars || {};
    this.talk = opts.talk || [];
    this.text = opts.text || false;
    this.html = false;
    this.client = opts.client || false;
    this.agent = opts.agent || false;
    this.container = opts.container || false;
  }

  uid() {
    return Math.floor(Math.random() * Date.now());
  }

  /***********
    func: formatHTML
    params: text - text string to format
    describe: the main formatting function where feecting text is converted into HTML.
  ***********/

  formatHTML() {
    this.text = '\n' + this.text.replace(/\@\@/g, '@');
    this.html = this.text
      // main label formatting

      .replace(/\n::BEGIN:(\w+)?:?(.+)?/g, '<div class="CONTAINER $1" data-id="$2">')
      .replace(/\n::END:(\w+)?:?(md5|sha256|sha512)?:?(.+)?/g, '</div>')

      .replace(/\n?\s+?\/\/(.+)/g, '<div class="comment">$1</div>')

      .replace(/(\n)(var):(.+)\r?/g, `$1<div class="item $2"><span class="label">$2</span><span class="value">$3</span></div>`)
      .replace(/(\n)(var)\[(.+)\]:(.+)\r?/g, `$1<div class="item $2"><span class="label">$3</span><span class="value">$4</span></div>`)

      .replace(/::begin:(\w+)?:?(.+)?/g, '<div class="box $1" data-id="$2">')
      .replace(/::end:(\w+)?:?(md5|sha256|sha512)?-?(.+)?/g, '</div>')

      .replace(/\n####\s(.+)/g, `<h4>$1</h4>`)
      .replace(/\n###\s(.+)/g, `<h3>$1</h3>`)
      .replace(/\n##\s(.+)/g, `<h2>$1</h2>`)
      .replace(/\n#\s(.+)/g, `<h1>$1</h1>`)

      .replace(/(\n)={4,}\n/g, `$1<hr class="double xsmall" />`)
      .replace(/(\n)={3}\n/g, `$1<hr class="double small" />`)
      .replace(/(\n)={2}\n/g, `$1<hr class="double medium" />`)
      .replace(/(\n)={1}\n/g, `$1<hr class="double large" />`)
      .replace(/(\n)-{4,}\n/g, `$1<hr class="single xsmall"/>`)
      .replace(/(\n)-{3}\n/g, `$1<hr class="single small"/>`)
      .replace(/(\n)-{2}\n/g, `$1<hr class="single medium"/>`)
      .replace(/(\n)-{1}\n/g, `$1<hr class="single large"/>`)

      .replace(/(\s)(\#.+?)(\b)/g, `$1<span class="tag thing">$2</span>$3`)
      .replace(/(\s)(\@.+?)(\b)/g, `$1<span class="tag person">$2</span>$3`)
      .replace(/(\s)(\$.+?)(\b)/g, `$1<span class="tag place">$2</span>$3`)
      .replace(/(\s)(\!.+?)(\b)/g, `$1<span class="tag bang">$2</span>$3`)

      .replace(/(\s)\_([#|@|$|!].+?)(\b)/gi, `$1$2$3`)

      // image processing regex
      .replace(/\nimage:\s?(.+)/g, `<div class="image"><img src="$1" /></div>`)
      .replace(/\n(avatar|thumbnail):\s?(.+)/g, `<div class="$1"><img src="$2" /></div>`)

      .replace(/\n?img:\s?(.+)\/(.+)\/(\d+)\/avatar/g, `<button class="btn avi" data-cmd="#space $2:$1 $3/main:look"><img src="/asset/$1/$2/$3/avatar" /></button>`)
      .replace(/\n?img:\s?(.+)/g, `<div class="image"><img src="/asset/$1" /></div>`)

      .replace(/\n(select)\[(.+):(.+)\]:(.+)/gi, `<div class="item $1"><span class="label" data-index="$2">$3</span><span class="input"><button type="button" class="input-select" name="$1" data-cloudbtn="$2">$4</button></span></div>`)
      .replace(/(\n?)(cloudconf)\[(.+)\]:(.+)/g, '$1<button class="btn $2" title="$3" data-cloudbtn="$4">$3</button>')
      .replace(/(\n?)(cloud)\[(.+)\]:(.+)/g, '$1<button class="btn cloudbtn" title="$3" data-cloudbtn="$4">$3</button>')
      .replace(/(\n?)(cloudcmd)\[(.+)\]:(.+)/g, '$1<button class="btn cloudcmd" title="$3" data-cloudcmd="$4">$3</button>')
      .replace(/(\n)?(look)\[(.+)\]:(.+)/g, '$1<button class="btn $2" title="$3" data-cloudcmd="look $4">$3</button>')

      .replace(/(\n?)(button)\[(.+)\]:(.+)/g, '$1<button class="btn $2" title="$3" data-button="$4">$3</button>')

      // cmd/tty tag parser
      .replace(/(\n)(cmd|tty):(.+)\r?/g, `$1<div class="item $2"><span class="label">$2</span><span class="value"><button class="btn $2" alt="$3" data-$2="$3">$3</button></span></div>`)
      .replace(/(\n)(cmd|tty)\[(.+)\]:(.+)\r?/g, `$1<div class="item $2"><span class="label">$2</span><span class="value"><button class="btn $2" alt="$2 $4" data-$2="$4">$3</button></span></div>`)

      .replace(/\n(\d+)\. (.+)/g, `<div class="number-item" data-label="$1">$2</div>`)
      .replace(/\n> (.+)\r?/g, `<div class="list-item">$1</div>`)
      .replace(/\n- (.+)\r?/g, `<div class="line-item">$1</div>`)

      // pdf links
      .replace(/(\n)(pdf):\s?(.+)/g, `$1<div class="$2"><iframe width="100%" height="100%" src="$3" frameborder="0"></iframe></div>`)

      // youtube links
      .replace(/\nyoutube:\s?(.+)/g, `\n<div class="center youtube-video-player"><iframe src="https://www.youtube.com/embed/$1" frameborder="0"></iframe></div>`)

      // youtube links
      .replace(/\nmap:\s?(.+)/g, `\n<div class="center google-map-player"><iframe src="https://www.google.com/maps/embed?pb=$1" frameborder="0" width="650" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`)



      // youtube links with parameters
      .replace(/(\n)(youtube)\[play\]:\s?(.+)/g, `\n<div class="center youtube-video-player"><iframe src="https://www.youtube.com/embed/$3?&autoplay=1" frameborder="0"></iframe></div>`)

      // links
      // link with just url
      .replace(/(\n?)(link):\s?(.+)/g, `$1<div class="item $2"><span class="label">link</span><span class="value"><a href="$3" class="$2" alt="$2" target="_blank">$3</a></span></div>`)

      // link with bracket label/text
      .replace(/(\n?)(link)\[(.+)\]:\s?(.+)/g, `$1<div class="item $2"><span class="label">link</span><span class="value"><a href="$4" class="$2" alt="$3" target="$2">$3</a></span></div>`)

      // numbered list item of href links
      .replace(/(\n?)(href)\[(\d+):(.+)\]:\s?(.+)(\r?)/g, `\n<div class="number-item" data-label="$3"><a href="$5" class="$2" alt="$4">$4</a></div>\r`)
      // standard href
      .replace(/(\n?)(href)\[(.+)\]:\s?(.+)(\r?)/g, `\n<a href="$4" class="$2" alt="$3">$3</a>\r`)


      .replace(/(\n)(audio)\[(.+)\]:\s?(.+)/g, `$1<div class="item $2"><span class="label">$2</span><span class="value"><audio class="$3" src="$4" controls autoplay></audio></span></div>`)

      // audio feature
      .replace(/(\n)(audio):\s?(.+)/g, `$1<div class="item $2"><span class="label">$1</span><span class="value"><audio class="$2-player" src="$3" controls></audio></span></div>`)

      .replace(/\[PRESS RETURN\]/g, '<div class="press_return"><button class="btn return" title="Press Return" data-cloudbtn="">Press Return</button><div>')

      // note info formatting
      .replace(/(\n?)(note|info|thanks|warning|alert|greeting|extra):\s?(.*)/gi, `$1<div class="$2">$3</div>`)

      .replace(/\n(a):\s?(.+)/gi, `<div class="article">$2</div>`)
      .replace(/\n(l):\s?(.+)/gi, `<div class="line">$2</div>`)

      .replace(/\n(gate)\[(.+)\]:\s?(.+)/gi, `<p><button class="btn speak" alt="Gateway" data-cmd="#gate $2 $3">💬</button> $3</p>`)

      .replace(/\n(p|h1|h2|h3|h4|h5|article|div|span)\[speak\]:\s?(.+)/gi, `<$1><button class="btn speak" alt="Speak" data-cmd="#voice say $2">💬</button> $2</$1>`)

      .replace(/\n(p|h1|h2|h3|h4|h5|article)\[speak\:(.+)?]:\s?(.+)/gi, `<$1><button class="btn speak" alt="Speak" data-cmd="#voice say:$2 $3">💬</button> $3</$1>`)

      .replace(/\n(p|div|span|h1|h2|h3|h4|h5|article|section|br):\s?(.+)/gi, `<$1>$2</$1>`)
      .replace(/\n(\w+):\s?(.+)/gi, `<div class="item $1"><span class="label">$1</span><span class="value">$2</span></div>`)
      .replace(/\n(\s{2})?(\w+):\s?(.+)/gi, `<div class="item $2 indent1"><span class="label">$2</span><span class="value">$3</span></div>`)
      .replace(/\n(\s{4})?(\w+):\s?(.+)/gi, `<div class="item $2 indent2"><span class="label">$2</span><span class="value">$3</span></div>`)
      .replace(/\n(\s{6})?(\w+):\s?(.+)/gi, `<div class="item $2 indent3"><span class="label">$2</span><span class="value">$3</span></div>`)
      .trim();

      // set the container
      // if (this.container) this.html = `<div class="${this.container}">${this.html}</div>`;

      // .replace(/(.+)\n\n/g, '<p>$1</p>')
      // .replace(/(.+)\n/g, '<div class="line">$1</div>')
      // .replace(/\n/g, '<div class="line br"></div>')

      // .replace(/\n\r?/g, '<div class="line"></div>');
      // .replace(/(.*)/g, '<div class="line">$1</div>');
    // Reference to https://github.com/sindresorhus/ansi-regex
    let cssStyle = []
    if (this.vars.bgcolor) cssStyle.push(`--browser-item-bgcolor:${this.vars.bgcolor.value}`);
    if (this.vars.bg) cssStyle.push(`--browser-item-image: url(${this.vars.bg.value})`);
    if (this.vars.color) cssStyle.push(`--browser-item-color: ${this.vars.color.value}`);
    if (this.vars.size) cssStyle.push(`--browser-item-size: ${this.vars.size.value}`);

    if (cssStyle.length) {
      this.html = `<section class="cover" style="${cssStyle.join(';')}">${this.html}</section>`;
    }
    return this.html;
  }

  /***********
    func: _extractVars
    describe: Recursive function to extract variables from a text string.
    params: text - text string to extract variables from.
  ***********/
  _extractVars() {
    if (!this.text) return false;
    const id = this.uid();
    const reggie = this.text.match(/\n(\#|\@|\$)(.+)\s?=\s?(.+)/);
    if (!reggie) return;

    this.vars[reggie[2].trim()] = {
      id,
      str: reggie[0],
      type: reggie[1].trim(),
      name: reggie[2].trim(),
      value: reggie[3].trim(),
    }
    this.text = this.text.replace(reggie[0], `\nvar[${reggie[1].trim()}${reggie[2].trim()}]:${reggie[3].trim()}\r`);
    return this._extractVars();
  }

  /***********
    func: getVars
    params: text - initial text string to get variables from.
    describe: this is a helper function to recursive _extractVars.
  ***********/
  getVars() {
    if (!this.text) return false;
    const {colors} = this.agent.prompt;
    this.text = this.text.replace(/::id::/g, this.id)
                          .replace(/::date::/g, formatDate(Date.now(), 'long', true))
                          .replace(/::agent_id::/g, this.agent.id)
                          .replace(/::agent_key::/g, this.agent.key)
                          .replace(/::agent_name::/g, this.agent.profile.name)
                          .replace(/::agent_color::/g, this.agent.profile.color)
                          .replace(/::agent_bgcolor::/g, this.agent.profile.bgcolor)
                          .replace(/::agent_describe::/g, this.agent.profile.describe)
                          .replace(/::agent_background::/g, this.agent.profile.background)
                          .replace(/::agent_emoji::/g, this.agent.prompt.emoji)
                          .replace(/::agent_avatar::/g, this.agent.profile.avatar)
                          .replace(/::client_id::/g, this.client.id)
                          .replace(/::client_name::/g, this.client.profile.name);
    return this._extractVars();
  }

  /***********
    func: extractTalk
    params: text - text string to extract talk triggers from.
    describe: extract talk functions from a text string to communication with other agents/deva.
  ***********/
  _extractTalk() {
    if (!this.text) return false;
    const id = this.uid();
    const reggie = (/(^|\n)talk:\s?(.+)/i).exec(this.text);
    if (!reggie) return;
    const placeholder = `::${id}::`;
    this.talk.push({
      id,
      placeholder,
      value: reggie[2],
    });
    this.text = this.text.replace(reggie[0], '\n' + placeholder + '\n')
    return this._extractTalk();
  }

  /***********
    func: getTalk
    params: text - text string to parse the talk triggers from.
    describe: Helper function to initiate recursive _extractTalk.
  ***********/
  getTalk() {
    if (!this.text) return false;
    return this._extractTalk();
  }
}

module.exports = (opts) => {
  const {meta, text, client, agent} = opts.q;
  const key = agent ? agent.key : client.key;
  const parser = new Parser({
    id: opts.id,
    key,
    cmd: meta.params.shift(),
    container: meta.params.length ? meta.params.join(' ') : false,
    params: meta.params,
    text,
    client,
    agent,
  });
  parser.getVars();
  parser.getTalk();
  return {
    text: parser.text.replace(/\\(#|@|$)/g, `$1`),
    html: parser.formatHTML(),
    data: {
      id: parser.id,
      params: parser.params,
      vars: parser.vars,
      talk: parser.talk,
    },
  }
}

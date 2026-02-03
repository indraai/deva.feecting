"use strict"
// Feecting Deva Parser
// Copyright ©2000-2026 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:63817777011592573888 LICENSE.md
// Sunday, January 4, 2026 - 8:37:21 AM

import fs from 'node:fs';
import path from 'node:path';

// set the __dirname
import {fileURLToPath} from 'node:url';    
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      .replace(/\n\s*::BEGIN:(\w+)?:?(.+)?/g, '<div class="CONTAINER $1" data-id="$2">')
      .replace(/\n\s*::END:(\w+)?:?(md5|sha256|sha512)?:?(.+)?/g, '</div>')

      .replace(/\n?\s+?\/\/(.+)/g, '<div class="comment">$1</div>')

      .replace(/(\n\s*)(var):(.+)\r?/g, `$1<div class="item $2"><span class="label">$2</span><span class="value">$3</span></div>`)
      .replace(/(\n\s*)(var)\[(.+)\]:(.+)\r?/g, `$1<div class="item $2"><span class="label">$3</span><span class="value">$4</span></div>`)

      .replace(/(\n\s*)::begin:(\w+)?:?(.+)?/g, '$1<div class="box $2" data-id="$3">')
      .replace(/(\n\s*)::end:(\w+)?:?(md5|sha256|sha512)?-?(.+)?/g, '$1</div>')

      .replace(/(\n\s*)####\s(.+)/g, `$1<h4>$2</h4>`)
      .replace(/(\n\s*)###\s(.+)/g, `$1<h3>$2</h3>`)
      .replace(/(\n\s*)##\s(.+)/g, `$1<h2>$2</h2>`)
      .replace(/(\n\s*)#\s(.+)/g, `$1<h1>$2</h1>`)

      .replace(/(\n\s*)={4,}(\n)/g, `$1<hr class="double xsmall" />$2`)
      .replace(/(\n\s*)={3}(\n)/g, `$1<hr class="double small" />$2`)
      .replace(/(\n\s*)={2}(\n)/g, `$1<hr class="double medium" />$2`)
      .replace(/(\n\s*)={1}(\n)/g, `$1<hr class="double large" />$2`)
      .replace(/(\n\s*)-{4,}(\n)/g, `$1<hr class="single xsmall"/>$2`)
      .replace(/(\n\s*)-{3}(\n)/g, `$1<hr class="single small"/>$2`)
      .replace(/(\n\s*)-{2}(\n)/g, `$1<hr class="single medium"/>$2`)
      .replace(/(\n\s*)-{1}(\n)/g, `$1<hr class="single large"/>$2`)

      .replace(/(\*\*|__)(?=(?:(?:[^`]*`[^`\r\n]*`)*[^`]*$))(?![^\/<]*>.*<\/.+>)(.*?)\1/gi, `<strong>$2</strong>`)
      .replace(/```(.*?)```/sg, '\n<pre><code>$1</code></pre>\n')
      .replace(/`(.*?)`/gi, '<code>$1</code>')

      .replace(/(\*\*)(.+)?(\*\*)/g, `<b>$2</b>`)
      // .replace(/(\s)(\#\w+)(\b)/g, `$1<span class="tag hash">$2</span>$3`)
      // .replace(/(\b)(\@.+?)(\b)/g, `$1<span class="tag person">$2</span>$3`)
      // .replace(/(\b)(\$.+?)(\b)/g, `$1<span class="tag place">$2</span>$3`)
      // .replace(/(\b)(\!.+?)(\b)/g, `$1<span class="tag bang">$2</span>$3`)
      //
      // .replace(/(\s)\_([#|@|$|!].+?)(\b)/gi, `$1$2$3`)

      // image processing regex
      .replace(/(\n\s*)img:\s?(.+)/g, `$1<div class="image"><img src="$2" /></div>`)
      .replace(/(\n\s*)thumb:\s?(.+)/g, `$1<div class="thumbnail"><img src="$2" /></div>`)
      .replace(/(\n\s*)(button)\[(.+)\]:\s?(.+)/g, '$1<button class="btn $2" title="$3" data-button="$4">$3</button>')

      // // cmd/tty tag parser
      // .replace(/(\n\s*)(cmd|tty):\s?(.+)\r?/g, `$1<div class="item $2"><span class="label">$2</span><span class="value"><button class="btn $2" alt="$2" data-$2="$3"></button>$3</span></div>`)
      // 
      // .replace(/(\s\n*)(cmd|tty)\[(.+)\]:(.+)\r?/g, `$1<div class="item $2"><span class="label">$2</span><span class="value"><button class="btn $2" alt="$2 $4" data-$2="$4">$3</button></span></div>`)

      // .replace(/(\s\n*)(law):(.+)\r?/g, `$1<div class="item $2"><button class="label" data-$2="#legal add $3">$2</button><span class="value">$3</span></div>`)
      // .replace(/(\s\n*)(law)\[(.+)\]:(.+)\r?/g, `$1<div class="item $2"><button class="label" data-$2="#legal add:$3 $4">$2</button><span class="value">$4</span></div>`)

      .replace(/(\n\s*)(\d+)\. (.+)/g, `$1<div class="number-item" data-label="$2">$3</div>`)
      .replace(/(\n\s*)> (.+)\r?/g, `$1<div class="list-item">$2</div>`)
      .replace(/(\n\s*)- (.+)\r?/g, `$1<div class="line-item">$2</div>`)

      // pdf links
      .replace(/(\n\s*)(pdf):\s?(.+)/g, `$1<div class="$2"><iframe width="100%" height="100%" src="$3" frameborder="0"></iframe></div>`)

      // youtube links
      .replace(/(\n\s*)(youtube):\s?(.+)/g, `$1<div class="center youtube-video-player"><iframe src="https://www.youtube.com/embed/$3" frameborder="0"></iframe></div>`)

      // links
      // link with just url
      .replace(/(\n\s*)(link):\s?(.+)/g, `$1<div class="item $2"><span class="label">link</span><span class="value"><a href="$3" class="$2" alt="$2" target="_blank">$3</a></span></div>`)

      // link with bracket label/text
      .replace(/(\n\s*)(link)\[(.+)\]:\s?(.+)/g, `$1<div class="item $2"><span class="label">link</span><span class="value"><a href="$4" class="$2" alt="$3" target="$2">$3</a></span></div>`)

      // numbered list item of href links
      .replace(/(\n\s*)(href)\[(\d+):(.+)\]:\s?(.+)(\r?)/g, `\n<div class="number-item" data-label="$3"><a href="$5" class="$2" alt="$4">$4</a></div>\r`)
      // standard href
      .replace(/(\n\s*)(href)\[(.+)\]:\s?(.+)(\r?)/g, `\n<a href="$4" class="$2" alt="$3">$3</a>\r`)


      .replace(/(\n\s*)(audio)\[(tts)\]:\s?(.+)/g, `$1<div class="item $2 $3"><span class="label">$2</span><span class="value"><audio src="$4" controls autoplay></audio></span></div>`)

      // audio feature
      .replace(/(\n\s*)(audio):\s?(.+)/g, `$1<div class="item $2"><span class="label">$2</span><span class="value"><audio class="$2-player" src="$3" controls></audio></span></div>`)

      .replace(/\[PRESS RETURN\]/g, '<div class="press_return"><button class="btn return" title="Press Return" data-cloudbtn="">Press Return</button><div>')

      .replace(/(\n\s*)(l):\s?(.+)/gi, `$1<div class="line">$3</div>`)

      .replace(/(\n\s*)(p|h1|h2|h3|h4|h5|article)\[speak\:(.+)?]:\s?(.+)/gi, `$1<$2><button class="btn speak" alt="Speak" data-cmd="#voice say:$3 $4">💬</button> $4</$2>`)

      .replace(/(\n\s*)(p|div|span|h1|h2|h3|h4|h5|article|section|br):\s?(.+)/gi, `$1<$2>$3</$2>`)

      .replace(/(\n\s*)(\w+):\s(.+)/gi, `$1<div class="item $2"><span class="label">$2</span><span class="value">$3</span></div>`)


      // strong format
      .trim();

      // set the container
      // if (this.container) this.html = `<div class="${this.container}">${this.html}</div>`;

      // .replace(/(.+)\n\n/g, '<p>$1</p>')
      // .replace(/(.+)\n/g, '<div class="line">$1</div>')
      // .replace(/\n/g, '<div class="line br"></div>')

      // .replace(/\n\r?/g, '<div class="line"></div>');
      // .replace(/(.*)/g, '<div class="line">$1</div>');
    // Reference to https://github.com/sindresorhus/ansi-regex
    let cssStyle = [];
    if (this.vars.bgcolor) cssStyle.push(`--browser-item-bgcolor:${this.vars.bgcolor.value}`);
    if (this.vars.bg) cssStyle.push(`--browser-item-background: url(${this.vars.bg.value})`);
    if (this.vars.color) cssStyle.push(`--browser-item-color: ${this.vars.color.value}`);
    if (this.vars.highlight) cssStyle.push(`--browser-item-highlight: ${this.vars.highlight.value}`);
    if (this.vars.shadow) cssStyle.push(`--browser-item-shadow: ${this.vars.shadow.value}`);
    if (this.vars.size) cssStyle.push(`--browser-item-size: ${this.vars.size.value}`);

    if (cssStyle.length) {
      this.html = `<section class="cover" style="${cssStyle.join(';')}">${this.html}</section>`;
    }

    return this.html;
  }

  /***********
    func: getVars
    params: text - initial text string to get variables from.
    describe: this is a helper function to recursive _extractVars.
  ***********/
  getVars(opts) {
    if (!this.text) return false;

    const {id, q} = opts;
    const {client, agent, data} = q;
    const {colors} = agent.prompt;

    const _profile = [];
    _profile.push(`::begin:profile`);
    for (let x in agent.profile) {
      _profile.push(`${x}: ${agent.profile[x]}`);
    }
    _profile.push(`::end:profile\n`);
    const profile = _profile.join('\n');
    
    const lookup = {
      client, 
      agent,
      prompt: agent.prompt,
      profile: agent.profile,
      vars: data.vars,
    }

    function processVars(token, data) {
      // first we split the token on the dot notation.
      const token_arr = token.split('.');
      // then if the token is only one length just return the value 
      let current = data;
      token_arr.forEach(item => {
        if (!current[item]) return false;        
        current = current[item];
      });
      try {
        current = current.replace(/\{\{(client|agent|profile|prompt|vars)\.(.+?)\}\}/g, (match, scope, token) => {
          return processVars(token, lookup[scope]);
        });        
      } 
      catch (err) {
        
        console.log('TOKEN\n', token);
        console.log('CURRENT\n', current);
        console.log('ERROR\n', err);
      }
      finally {
        return current;      
      }
    }
    
    this.text = this.text.replace(/\{\{id\}\}/g, id)
                        .replace(/\{\{today\}\}/g, formatDate(Date.now(), 'long', true))                          
                        .replace(/\{\{(client|agent|profile|prompt|vars)\.(.+?)\}\}/g, (match, scope, token) => {
                          return processVars(token, lookup[scope]);
                        }).replace(/\{\{profile\}\}/g, (match,token) => {
                          return profile || false;
                        });
    // when all the default variables and values are set then extract the vars in the local text.
    return this._extractVars();
  }

  /***********
    func: _extractVars
    describe: Recursive function to extract variables from a text string.
    params: text - text string to extract variables from.
  ***********/
  _extractVars() {
    if (!this.text) return false;
    const reggie = this.text.match(/\n\s*(\#|\@|\$)(.+)\s?=\s?(.+)/);
    if (!reggie) return;
  
    this.vars[reggie[2].trim()] = {
      type: reggie[1].trim(),
      name: reggie[2].trim(),
      value: reggie[3].trim(),
    }
    this.text = this.text.replace(reggie[0], `\nvar[${reggie[1].trim()}${reggie[2].trim()}]:${reggie[3].trim()}\r`);
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
    const reggie = (/(\n\s*)talk:\s?(.+)/i).exec(this.text);
    if (!reggie) return;
    const placeholder = `{{${id}}}`;
    this.talk.push({
      id,
      placeholder,
      value: reggie[2],
    });
    this.text = this.text.replace(reggie[0], '\n' + placeholder)
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

export default (opts) => {
  const {meta, text, client, agent, data} = opts.q;
  const vars = data.vars || {};
  const key = agent ? agent.key : client.key;

  const parser = new Parser({
    id: opts.id,
    key,
    cmd: meta.params.shift(),
    container: meta.params.length ? meta.params.join(' ') : false,
    params: meta.params,
    text: text.replace(/(\n)(\s*)(\W|\b)/g, '$1$3'),
    client,
    agent,
    vars,
  });

  parser.getVars(opts);
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

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
const EventEmitter = require('events');
const Track = require('./track_babel.js');
},{"./track_babel.js":3,"events":1}],3:[function(require,module,exports){
class TrackLayout {
    constructor() {
        this.tracks = [];
    }

    getTrack(name) {
        var nameParts = name.split('.');
        if (nameParts.length < 3) return false;

        var key = nameParts[0] + '.' + nameParts[1] + '.' + nameParts[2];
        if (typeof this.tracks[key] !== 'undefined') {
            return this.tracks[key];
        }

        return false;
    }

    getSubTrack(name) {
        var track = this.getTrack(name);

        if (!track) return false;

        var nameParts = name.split('.');
        if (nameParts.length < 4) return false;

        var subSectionName = nameParts[2] + '.' + nameParts[3];

        var subsection = false;

        track.subs.forEach(function (sub) {
            if (sub.name === subSectionName) subsection = sub;
        });

        return subsection;
    }

    /*
     * Load a set of track data into the tracks object tree
     */
    load(rawTracks) {
        this._insertTracks(rawTracks);
        this._link();
    }

    /*
     * Parse the track data
     */
    _insertTracks(rawTracks) {
        rawTracks.forEach(function (track) {
            if (track.type === 'rail') {
                var trackObj = new Track();
                trackObj.type = 'rail';
                trackObj.name = track.name;
                trackObj.group = track.group;
                trackObj.next = track.next;
                trackObj.previous = track.previous;
                trackObj.trackLayout = this;

                trackObj.genSubTracks(track.subs);

                this.tracks[trackObj.group + '.tr.' + trackObj.name] = trackObj;
            } else if (track.type === 'switchNormal') {
                var trackObj = new SwitchTrack();
                trackObj.type = 'switchNormal';
                trackObj.name = track.name;
                trackObj.group = track.group;
                trackObj.length = track.length;
                trackObj.height = track.height;
                trackObj.splitPosition = track.splitPosition;
                trackObj.x = track.x;
                trackObj.y = track.y;
                trackObj.nextNormal = track.nextNormal;
                trackObj.nextReversed = track.nextReversed;
                trackObj.previous = track.previous;
                trackObj.trackLayout = this;

                trackObj.genSubTracks([]);

                this.tracks[trackObj.group + '.sw.' + trackObj.name] = trackObj;
            }
        }, this);
    }

    /*
     * Link all unlinked tracks together using the text IDs from the raw track data
     */
    _link() {
        // Because the array's keys are strings, this cats as a foreach loop
        for (var key in this.tracks) {
            if (this.tracks.hasOwnProperty(key)) this.tracks[key].link();
        }
    }
}

class Track {
    constructor() {
        this.type = null;
        this.name = null;
        this.group = null;
        this.subs = [];
        this.next = null;
        this.previous = null;
        this.trackLayout = null;
    }

    genSubTracks(subs) {
        var char = 'a';

        subs.forEach(function (sub) {
            if (sub.type === 'straight') {
                var subtrack = new StraightSubTrack();
                subtrack.name = this.name + '.' + char;
                subtrack.x0 = sub.x0;
                subtrack.y0 = sub.y0;
                subtrack.x1 = sub.x1;
                subtrack.y1 = sub.y1;
                subtrack.track = this;
                subtrack.previous = sub.previous;
                subtrack.next = sub.next;
                this.subs.push(subtrack);

                char = nextChar(char);
            }
        }, this);
    }

    link() {
        // Correct the previous and next from text to references
        this._linkTrack();
        this._linkSubTracks();
    }

    _linkTrack() {
        if (typeof this.next === 'string') this.next = this.trackLayout.getTrack(this.next);
        if (typeof this.previous === 'string') this.previous = this.trackLayout.getTrack(this.previous);
    }

    _linkSubTracks() {
        var nrSubs = this.subs.length;
        var prev = null;

        this.subs.forEach(function (sub, index) {
            if (typeof sub.previous === 'string') {
                // If a previous track was set manually
                sub.previous = this.trackLayout.getSubTrack(sub.previous);
            } else {
                if (index === 0) {
                    // It's the first one in the list
                    if (this.previous !== null) sub.previous = this.previous.getSubTrackAt(sub.x0, sub.y0, 1);
                } else {
                    sub.previous = prev;
                }
            }

            if (typeof sub.next === 'string') {
                // If the next track was set manually
                sub.next = this.trackLayout.getSubTrack(sub.next);
            } else {
                if (index === nrSubs - 1) {
                    // It's the last one in the list
                    if (this.next !== null) sub.next = this.next.getSubTrackAt(sub.x1, sub.y1, 1);
                } else {
                    sub.next = this.subs[index + 1];
                }
            }

            prev = sub;
        }, this);
    }

    getSubTrackAt(x, y, maxDrift) {
        var subTrack = false;

        this.subs.forEach(function (sub) {
            if (sub.isAt(x, y, maxDrift)) subTrack = sub;
        });

        return subTrack;
    }
}

class SwitchTrack extends Track {
    constructor() {
        super();

        this.length = null;
        this.height = 0;
        this.splitPosition = null;
        this.x = null;
        this.y = null;

        this.nextNormal = null;
        this.nextReversed = null;
    }

    genSubTracks(subs) {
        // The switching starting subsection
        var preSubTrack = new SwitchSubTrack();
        preSubTrack.name = this.name + '.a';
        preSubTrack.switchState = 'r';
        preSubTrack.x0 = this.x;
        preSubTrack.y0 = this.y;
        preSubTrack.x1 = this.x + this.splitPosition;
        preSubTrack.y1 = this.y;
        preSubTrack.track = this;
        this.subs.push(preSubTrack);

        // The normal leg
        var normalSubTrack = new StraightSubTrack();
        normalSubTrack.name = this.name + '.b';
        normalSubTrack.x0 = this.x + this.splitPosition;
        normalSubTrack.y0 = this.y;
        normalSubTrack.x1 = this.x + this.length;
        normalSubTrack.y1 = this.y;
        normalSubTrack.track = this;
        this.subs.push(normalSubTrack);

        // The reversed leg
        var reversedSubTrack = new StraightSubTrack();
        reversedSubTrack.name = this.name + '.c';
        reversedSubTrack.x0 = this.x + this.splitPosition;
        reversedSubTrack.y0 = this.y;
        reversedSubTrack.x1 = this.x + this.length;
        reversedSubTrack.y1 = this.y + this.height;
        reversedSubTrack.track = this;
        this.subs.push(reversedSubTrack);

        // Since we have the variables handy here, we'll link them internally now
        preSubTrack.nextNormal = normalSubTrack;
        preSubTrack.nextReversed = reversedSubTrack;

        normalSubTrack.previous = preSubTrack;
        reversedSubTrack.previous = preSubTrack;
    }

    _linkTrack() {
        if (typeof this.nextNormal !== 'undefined') this.nextNormal = this.trackLayout.getTrack(this.nextNormal);
        if (typeof this.nextReversed !== 'undefined') this.nextReversed = this.trackLayout.getTrack(this.nextReversed);
        if (typeof this.previous !== 'undefined') this.previous = this.trackLayout.getTrack(this.previous);
    }

    _linkSubTracks() {
        // A horrible hardcoded mess
        this.subs[0].previous = this.previous.getSubTrackAt(this.subs[0].x0, this.subs[0].y0, 1);
        this.subs[1].next = this.nextNormal.getSubTrackAt(this.subs[1].x1, this.subs[1].y1, 1);
        this.subs[2].next = this.nextReversed.getSubTrackAt(this.subs[2].x1, this.subs[2].y1, 1);
    }
}

/*
 * Base class for all sub tracks, this included switches
 */
class SubTrackBase {
    /*
     * Constructor: sets init information
     */
    constructor() {
        this.name = null;
        this.track = null;
    }

    /*
     * Returns the length of the track
     */
    getLength() {
        throw 'Abstract';
    }

    /*
     * Get the route a train would follow, starting from this track
     */
    getRoute(direction, length) {
        throw 'Abstract';
    }

    /*
     * test if the subsection is a given 2D point
     */
    isAt(x, y, maxDrift) {
        throw 'Abstract';
    }
}

/*
 * Base class for normal tracks. These are simple tracks without any fancy switches
 */
class NormalSubTrack extends SubTrackBase {
    /*
     * Constructor: sets init information
     */
    constructor() {
        super();

        /*
         * These are references to the previous and next track
         */
        this.previous = null;
        this.next = null;
    }

    /*
     * Get the next track reference
     */
    getNext() {
        return this.next;
    }

    /*
     * Get the previous track reference
     */
    getPrevious() {
        return this.previous;
    }

    getTrackPosition(position) {
        var track = this;

        if (position < 0) {
            track = this.getPrevious();
            if (track === null) throw 'No track!';

            position = track.getLength() - Math.abs(position);
        } else if (position > this.getLength()) {
            var prevTrack = track;
            track = this.getNext();
            if (track === null) throw 'No track!';

            position = position - prevTrack.getLength();
        }

        return { track: track, position: position };
    }

    /*
     * Get the route a train would follow, starting from this track
     * Note that the returned that probably won't have the exact length specified. It can either be more (it rounds up to full tracks) of less (if the route ends short of the length)
     */
    getRoute(direction, length) {
        var route = [this];

        length = length - this.getLength();

        if (length > 0) {
            if (direction === 0 && this.getPrevious() !== null) {
                route = route.concat(this.getPrevious().getRoute(direction, length));
            }
            if (direction === 1 && this.getNext() !== null) {
                route = route.concat(this.getNext().getRoute(direction, length));
            }
        }

        return route;
    }
}

/*
 * The class for straight tracks (so, not gay or curved)
 */
class StraightSubTrack extends NormalSubTrack {
    /*
     * Constructor: sets init information
     */
    constructor() {
        super();

        /*
         * Coordinates in meters
         */
        this.x0 = null;
        this.y0 = null;
        this.x1 = null;
        this.y1 = null;
    }

    /*
     * Returns the length of the track
     */
    getLength() {
        if (this.x0 === null || this.y0 === null || this.x1 === null || this.y1 === null) {
            throw 'Coordinates are not complete';
        }

        var a = this.x0 - this.x1;
        var b = this.y0 - this.y1;

        return Math.sqrt(a * a + b * b);
    }

    /*
     * test if the subsection is a given 2D point
     */
    isAt(x, y, maxDrift) {
        if (pointsToDistance(this.x0, this.y0, x, y) <= maxDrift) return true;else if (pointsToDistance(this.x1, this.y1, x, y) <= maxDrift) return true;

        return false;
    }
}

class SwitchSubTrack extends StraightSubTrack {
    constructor() {
        super();

        this.switchState = 'n';
        this.nextNormal = null;
        this.nextReversed = null;
    }

    getNext() {
        if (this.switchState === 'n') return this.nextNormal;

        return this.nextReversed;
    }
}

module.exports = TrackLayout;

},{}]},{},[2]);

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

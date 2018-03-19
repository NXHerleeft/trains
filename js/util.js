function nextChar(c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}

function pointsToDistance(x0, y0, x1, y1) {
    var x = Math.abs(x1 - x0);
    var y = Math.abs(y1 - y0);

    return Math.sqrt(x*x + y*y);
}

function pointsToAngle(x0, y0, x1, y1){
    return Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
}

class Vector {
    constructor(x0, y0, x1, y1) {
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this._angle = null; // Only used when the second coords are not set
    }

    point0() {
        return {x: this.x0, y: this.y0};
    }

    point1() {
        return {x: this.x1, y: this.y1};
    }

    coords() {
        return [
            this.point0(),
            this.point1()
        ];
    }

    length() {
        let a = Math.abs(this.x0 - this.x1);
        let b = Math.abs(this.y0 - this.y1);

        return Math.sqrt(a*a + b*b);
    }

    angle() {
        return pointsToAngle(this.x0, this.y0, this.x1, this.y1);
    }

    setLength(length) {
        if(!length)
            return false;

        var scalar = length / this.length();

        return new Vector(this.x0, this.y0, this.x1*scalar, this.y1*scalar);
    }
}
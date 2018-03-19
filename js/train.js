/*
 * Class that defines rolling stock. It is part of a train as it's composition. Rolling stock can be engines, passenger carriages or goods wagons
 */
class Stock {
	constructor() {
		this.name = null;
		this.type = null; // engine, passenger or goods
		this.length = null;
		this.position = null; // The position of the front of the stock (front of the train)
		this.axis0 = null; // The x position of the first axis
		this.axis1 = null; // The x position of the second axis
		
		this.maxAllowedSpeed = null; // In m/s
		this.power = null; // Only for engines (kW)
		
		this.emptyWeight = null; // The empty weight of the rolling stock (in kg)
		this.maxLoad = null; // The max weight that can be loaded onto the rolling stock (in kg)
		this.percentageFilled = 0; // The amount the rolling stock is filled (from 0 to 1)
		
		/*
		 * This data is cached for easy access
		 */
		this.axis0Track = null;
		this.axis0TrackPosition = null;
		this.axis1Track = null;
		this.axis1TrackPosition = null;
	}
}

/*
 * Train defines a train in the simulation. It mainly consists of a composition, a track and a position on the track
 */
class Train {
	constructor() {
		this.composition = []; // Item 0 is the most left, the last one is the most right
		this.trainNumber = null;
		
		this.direction = null; // 0 for left, 1 for right. Should only be set manually at spawn!!
		this.track = null; // The track the front stock is located on

		this.tracks = [];

		this.speed = 0; // In m/s, cannot be negative. Should never be set manually!
		this.throttle = 0; // The amount of throttle (between 0 and 1)
		this.brake = 0; // The requested brake force (between 0 and 1)
		this.position = null; // The position on the track (in meters from the front of the train)
		
		this._updatePosition = true; // Whether the train's position should get updated (not nessecary when stationary)
	}
	
	/*
	 * Get the total length of the train
	 */
	getLength() {
		var length = 0;
		
		this.composition.forEach(function(stock) {
			length = length + stock.length;
		});
		
		return length;
	}
	
	/*
	 * Add a piece of rolling stock to the train
	 */
	addStock(stock, position) {
		if(position == 0) { // Add items to the start of the array
			this.composition.unshift(stock);
		}
		else if(position == 1) { // Add items to the end of the array
			this.composition.push(stock);
		}
		
		this._updateCompositionPosition();
	}
	
	/*
	 * Get the projected route from the front of the train
	 */
	getRoute(length) {
		return this.track.getRoute(this.direction, length);
	}
	
	/*
	 * Get the tracks the train is occupiing
	 */
	getTracks() {
		
	}
	
	/*
	 * Change the direction of the train, so the back becomes the front
	 */
	changeDirection() {
		if(this.speed != 0)
			return false;
		
		this.direction = 1-this.direction;
		
		if(this.direction == 1) { // If the NEW direction is to the right
			var trackPosition = this.track.getTrackPosition(this.position + this.getLength());
		}
		else if(this.direction == 0) { // If the NEW direction is to the left
			var trackPosition = this.track.getTrackPosition(this.position - this.getLength());
		}
		this.track = trackPosition.track;
		this.position = trackPosition.position;
		
		this._updateCompositionPosition();
		
		return true;
	}
	
	/*
	 * Allows you to set the direction explicitely, if you are too lazy to do this check yourself
	 */
	setDirection(direction) {
		if(direction != this.direction) {
			return this.changeDirection();
		}
		
		return true;
	}
	
	setThrottle(throttle) {
		this.throttle = throttle;
		
		this._updatePosition = true;
	}
	
	setBrake(brake) {
		this.brake = brake;
	}
	
	/*
	 * Update all information of the train, should be called periodically to update the position and speed
	 */
	update(time) {
		if(this._updatePosition) {
			this._updateFrontPosition(time);
			this._updateCompositionPosition();
			this._updateDynamics(time);
		}
		
		// Disable position updating if the speed is 0
		if(this.speed == 0.0)
			this._updatePosition = false;
	}
	
	/*
	 * Internal. Update the position of the front of the train
	 */
	_updateFrontPosition(time) {
		var distance = this.speed * time/1000;
		if(this.direction == 0) {
			var newPosition = this.position - distance;
		}
		if(this.direction == 1) {
			var newPosition = this.position + distance;
		}
		
		var trackPosition = this.track.getTrackPosition(newPosition);
		this.track = trackPosition.track;
		this.position = trackPosition.position;
		
		return true;
	}
	
	/*
	 * Internal. Update the position of each carriage in the composition. It currently doesn't update the carriage's axes
	 */
	_updateCompositionPosition() {
		if(this.direction == 0) {
			var position = this.position;
			var track = this.track;
			var composition = this.composition.slice();
			
			composition.forEach(function(stock) {
				stock.position = position;
				stock.track = track;
				
				var trackPosition = track.getTrackPosition(position + stock.length);
				track = trackPosition.track;
				position = trackPosition.position;
			});
		}
		if(this.direction == 1) {
			var position = this.position;
			var track = this.track;
			var composition = this.composition.slice();
			composition.reverse();
			
			composition.forEach(function(stock) {
				stock.position = position;
				stock.track = track;
				
				var trackPosition = track.getTrackPosition(position - stock.length);
				track = trackPosition.track;
				position = trackPosition.position;
			});
		}
	}
	
	/*
	 * Internal. Update the dynamic variables of the train, like speed.
	 */
	_updateDynamics(time) {
		var a = this.throttle; // To be filled with a nice variable
		
		this.speed = Math.max(0, this.speed + (a*(time/1000)));
	}
}
<!doctype html>
<html>
<head>
    <title>Train track following test</title>

    <script type="text/javascript" src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
    <script type="text/javascript" src="js/util.js"></script>
    <script type="text/javascript" src="js/track.js"></script>
    <script type="text/javascript" src="js/train.js"></script>
</head>
<body>
	hoi!
	<br /><input type="text" id="throttle" name="throttle" value="0" onchange="updateThrottle();" />
	<br /><input type="text" id="break" name="break" value="0" onchange="updateBreak();" />
	<br /><button type="button" id="toggle" onclick="train.changeDirection();">Rijrichting veranderen</button>
	<script>

		var train = null;

		var trackLayout = new TrackLayout();
		$.getJSON('trackDefs.json', function(data) {
		    // Parse all JSON sections into Section objects
            trackLayout.load(data);

		    console.log(trackLayout);
		    console.log(trackLayout.getTrack('nm.tr.123CT.a'));

            var engine = new Stock();
            engine.name = '2225';
            engine.type = 'engine';
            engine.length = 14;
            engine.axis0 = 1;
            engine.axis1 = 13;
            engine.maxSpeed = 27.778;
            engine.power = 662;
            engine.emptyWeight = 72000;
            engine.maxLoad = 0;
            engine.percentageFilled = 0;

            var carriage = new Stock();
            carriage.name = 'wagon';
            carriage.type = 'goods';
            carriage.length = 10;
            carriage.axis0 = 1;
            carriage.axis1 = 9;
            carriage.maxSpeed = 22;
            carriage.power = 0;
            carriage.emptyWeight = 9360;
            carriage.maxLoad = 4000;
            carriage.percentageFilled = 0.75;

            train = new Train();
            train.trainNumber = '99001';
            train.direction = 1;
            train.speed = 0;
            train.track = trackLayout.getSubTrack('nm.tr.123BT.a');
            train.position = 500;
            train.addStock(engine, 0);
            train.addStock(carriage, 0);
            //train._updateCompositionPosition();

            var intervalTime = 50;
            var interval = null;
            try {
                function updateTrains() {
                    train.update(intervalTime);
                    if(train._updatePosition) {
                        console.log(
                            'Direction: ' + train.direction +
                            ' Speed: ' + train.speed.toFixed(2) +
                            ' Position 0: ' + train.composition[0].position.toFixed(2) +
                            ' Position 1: ' + train.composition[1].position.toFixed(2) +
                            ' Track: ' + train.track.name
                        );
                    }
                }

                interval = setInterval(updateTrains, intervalTime);
            }
            catch (e) {
                clearInterval(interval);
            }
        });
		
		function updateThrottle() {
			train.setThrottle(parseFloat(document.getElementById('throttle').value));
		}
		
		function updateBrake() {
			train.setBrake(parseFloat(document.getElementById('brake').value));
		}
	</script>
</body>
</html>
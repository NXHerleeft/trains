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
<canvas id="arcTest" width="400" height="400"></canvas>
<script>
    var canvas = document.getElementById('arcTest');
    var ctx = canvas.getContext('2d');

    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    //ctx.arc(100, 100, 50, 0, 2*Math.PI);

    var vector = new Vector(20, 100, 60, 100);

    ctx.beginPath();
    ctx.arc(vector.x0, vector.y0, 4, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vector.x1, vector.y1, 4, 0, 2*Math.PI);
    ctx.fill();

    vector = vector.setLength(100);
    ctx.beginPath();
    ctx.arc(vector.x1, vector.y1, 4, 0, 2*Math.PI);
    ctx.fill();

    //ctx.stroke();
</script>
</body>
</html>
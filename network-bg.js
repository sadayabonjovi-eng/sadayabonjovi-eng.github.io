(function () {
  var canvas = document.createElement('canvas');
  canvas.id = 'network-bg';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  document.body.prepend(canvas);

  function readColor(varName, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 480;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var NODE_COUNT = window.innerWidth < 700 ? 45 : 90;
  var SPREAD = 700;
  var LINK_DIST = 150;

  var positions = new Float32Array(NODE_COUNT * 3);
  var velocities = [];
  for (var i = 0; i < NODE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * SPREAD;
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
    velocities.push({
      x: (Math.random() - 0.5) * 0.15,
      y: (Math.random() - 0.5) * 0.15,
      z: (Math.random() - 0.5) * 0.15
    });
  }

  function hexToThree(hex) {
    try { return new THREE.Color(hex); } catch (e) { return new THREE.Color('#5eead4'); }
  }

  var pointColor = hexToThree(readColor('--signal', '#5eead4'));
  var lineColor = hexToThree(readColor('--signal-dim', '#2b5c54'));

  var pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var pointsMat = new THREE.PointsMaterial({ color: pointColor, size: 3.2, transparent: true, opacity: 0.85 });
  var points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  var maxLines = NODE_COUNT * 8;
  var linePositions = new Float32Array(maxLines * 6);
  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  var lineMat = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.35 });
  var lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // ── Signal pulses: small glowing points that travel along active
  // connection lines, evoking data moving through an automation pipeline ──
  var PULSE_COUNT = 6;
  var pulsePositions = new Float32Array(PULSE_COUNT * 3);
  var pulses = [];
  for (var p = 0; p < PULSE_COUNT; p++) {
    pulses.push({ a: -1, b: -1, t: Math.random(), speed: 0.006 + Math.random() * 0.006 });
  }
  var pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
  var pulseMat = new THREE.PointsMaterial({
    color: pointColor, size: 5.5, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  var pulsePoints = new THREE.Points(pulseGeo, pulseMat);
  scene.add(pulsePoints);

  function refreshColors() {
    pointsMat.color = hexToThree(readColor('--signal', '#5eead4'));
    lineMat.color = hexToThree(readColor('--signal-dim', '#2b5c54'));
    pulseMat.color = hexToThree(readColor('--signal', '#5eead4'));
  }

  var mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.attributeName === 'class') refreshColors();
    });
  });
  mo.observe(document.body, { attributes: true });

  var mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate() {
    requestAnimationFrame(animate);

    if (!reduceMotion) {
      for (var i = 0; i < NODE_COUNT; i++) {
        positions[i * 3] += velocities[i].x;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;

        for (var axis = 0; axis < 3; axis++) {
          var idx = i * 3 + axis;
          if (positions[idx] > SPREAD / 2 || positions[idx] < -SPREAD / 2) {
            velocities[i][axis === 0 ? 'x' : axis === 1 ? 'y' : 'z'] *= -1;
          }
        }
      }
      pointsGeo.attributes.position.needsUpdate = true;

      var lineIdx = 0;
      var currentEdges = [];
      for (var a = 0; a < NODE_COUNT && lineIdx < maxLines; a++) {
        for (var b = a + 1; b < NODE_COUNT && lineIdx < maxLines; b++) {
          var dx = positions[a * 3] - positions[b * 3];
          var dy = positions[a * 3 + 1] - positions[b * 3 + 1];
          var dz = positions[a * 3 + 2] - positions[b * 3 + 2];
          var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < LINK_DIST) {
            linePositions[lineIdx * 6] = positions[a * 3];
            linePositions[lineIdx * 6 + 1] = positions[a * 3 + 1];
            linePositions[lineIdx * 6 + 2] = positions[a * 3 + 2];
            linePositions[lineIdx * 6 + 3] = positions[b * 3];
            linePositions[lineIdx * 6 + 4] = positions[b * 3 + 1];
            linePositions[lineIdx * 6 + 5] = positions[b * 3 + 2];
            currentEdges.push([a, b]);
            lineIdx++;
          }
        }
      }
      lineGeo.setDrawRange(0, lineIdx * 2);
      lineGeo.attributes.position.needsUpdate = true;

      if (currentEdges.length) {
        for (var p2 = 0; p2 < PULSE_COUNT; p2++) {
          var pulse = pulses[p2];
          if (pulse.a === -1 || pulse.t >= 1) {
            var edge = currentEdges[(Math.random() * currentEdges.length) | 0];
            pulse.a = edge[0];
            pulse.b = edge[1];
            pulse.t = 0;
          }
          pulse.t += pulse.speed;
          var ta = Math.min(pulse.t, 1);
          pulsePositions[p2 * 3]     = positions[pulse.a * 3]     + (positions[pulse.b * 3]     - positions[pulse.a * 3])     * ta;
          pulsePositions[p2 * 3 + 1] = positions[pulse.a * 3 + 1] + (positions[pulse.b * 3 + 1] - positions[pulse.a * 3 + 1]) * ta;
          pulsePositions[p2 * 3 + 2] = positions[pulse.a * 3 + 2] + (positions[pulse.b * 3 + 2] - positions[pulse.a * 3 + 2]) * ta;
        }
        pulseGeo.attributes.position.needsUpdate = true;
      }

      scene.rotation.y += 0.0006;
      scene.rotation.x += 0.0002;
    }

    camera.position.x += (mouseX * 60 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 40 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();

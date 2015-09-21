/* global THREE, DeviceOrientationController */
'use strict';
const EventEmitter = require('fast-event-emitter');
const util = require('util');
const TWEEN = require('tween.js');

// no hsts so just redirect to https
if (window.location.protocol !== "https:" && window.location.hostname !== 'localhost') {
   window.location.protocol = "https:";
}

function MyThree(target = document.body){

	EventEmitter.call(this);

	const scene = new THREE.Scene();
	this.scene = scene;

	const camera = new THREE.PerspectiveCamera( 75, target.scrollWidth / target.scrollHeight, 0.1, 100 );
	camera.height = 2;
	camera.position.set(0, camera.height, 0);
	camera.lookAt(new THREE.Vector3(0, camera.height, -9));
	camera.rotation.y += Math.PI;
	this.camera = camera;

	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( target.scrollWidth, target.scrollHeight );
	renderer.shadowMapEnabled = true;
	
	this.renderMethod = renderer;

	target.appendChild(renderer.domElement);
	this.domElement = renderer.domElement;

	const ambientLight = new THREE.AmbientLight( 0x666666 );
	scene.add( ambientLight );

	const path = "images/";
	const format = '.jpg';
	const urls = [
		path + 'px' + format, path + 'nx' + format,
		path + 'py' + format, path + 'ny' + format,
		path + 'pz' + format, path + 'nz' + format
	];
	const reflectionCube = THREE.ImageUtils.loadTextureCube( urls );
	reflectionCube.format = THREE.RGBFormat;

	const materials = {
		shiny: new THREE.MeshLambertMaterial( { color: 0x99ff99, specular: 0x440000, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.3, metal: true} ),
		boring: new THREE.MeshLambertMaterial( { color: 0xFFFFFF, specular: 0x440000 } ),
		wireframe: new THREE.MeshBasicMaterial( { color: 0xFFFFFF, wireframe: true } )
	};
	this.materials = materials;

	const physicsObjects = [];
	const threeObjectsConnectedToPhysics = {};
	this.updateObjects = newObjects => {
		physicsObjects.splice(0);
		physicsObjects.push.apply(physicsObjects, newObjects);
	};
	
	this.on('prerender', function updatePositions() {

		// iterate over the physics physicsObjects
		for ( let i of physicsObjects ) {

			if (threeObjectsConnectedToPhysics[i.id]) {
				threeObjectsConnectedToPhysics[i.id].position.set(i.position.x, i.position.y, i.position.z);

				// Don't set quaternian
				if (i.quaternion) {
					threeObjectsConnectedToPhysics[i.id].rotation.setFromQuaternion(new THREE.Quaternion(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w));
				}
			}
		}
	});

	this.on('prerender', TWEEN.update);

	this.connectPhysicsToThree = (mesh, physicsMesh) => {
		threeObjectsConnectedToPhysics[physicsMesh.id] = mesh;
		scene.add(mesh);
	};

	this.createSphere = (radius) => {
		const geometry = new THREE.SphereGeometry(radius || 1, 8, 5);
		const mesh = new THREE.Mesh(geometry, materials.wireframe);
		return mesh;
	};

	this.walkTo = (destination) => {
		new TWEEN.Tween( camera.position )
			.to( destination, 2000 )
			.easing( TWEEN.Easing.Quadratic.Out )
			.onUpdate( function () {
				camera.position.set(this.x, this.y, this.z);
			})
			.start();
	};

	this.getCameraPositionAbove = function (point, ...objects) {
		const raycaster = new THREE.Raycaster(point, new THREE.Vector3(0, -1, 0), 0, 20);
		const hits = raycaster.intersectObjects(objects);
		if (!hits.length) {
			return Promise.reject();
		} else {
			hits[0].point.y += camera.height;
			return Promise.resolve(hits[0].point);
		}
	};

	this.pickObjects = function(root, ...namesIn) {

		const collection = {};
		const names = new Set(namesIn);

		(function pickObjects(root) {
			if (root.children) {
				root.children.forEach(node => {
					if (names.has(node.name)) {
						collection[node.name] = node;
						names.delete(node.name);
					}
					if (names.size) {
						pickObjects(node);
					}
				});
			}
		})(root);

		if (names.size) {
			console.warn('Not all objects found: ' + names.values().next().value + ' missing');
		}

		return collection;
	};

	this.animate = () => {
		/*jshint validthis: true */

		// note: three.js includes requestAnimationFrame shim
		this.emit('prerender');
		this.renderMethod.render(scene, camera);
	};

	scene.fog = new THREE.Fog(0xff3399, 0.1, 100);
	this.useFog = () => {
		scene.fog.far = 11;
		renderer.setClearColor( scene.fog.color );
	};
}
util.inherits(MyThree, EventEmitter);

module.exports = MyThree;
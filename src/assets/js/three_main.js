import * as THREE from 'three'
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader'
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { TrackballControls } from './three_TrackballControlsTH.js';
// import utils from './utils';
// import loadingBar from "./loadingbar";


var Main = (function () {
	var percentComplete = 0;
	var timerID = null;
	var defaultMat;
	var container;
	var camera, scene, renderer, raycaster;
	var mouse,modelMesh,brushMesh,circleGeo,circleMaterial;
	var controls;
	var isLoadedModel = false;
	var isShiftDown = false;
	var markObjects = [];
	var marksFromModel = [];
	var brushSize = 2;
	var brushColor = 0xEA1A1A;
	var mouseDown = false;
	var mouseRightDown = false;
	var prePoint = null;
	var ambientLight     = null;
	var directionalLight = null;
	var pointLight       = null;
	var sceneBgColor = 0x333333;
	var _this;
	var vue;
	var mouseOffset = {top:0,left:0};

	function Main(vue_) {
		vue = vue_;
		_this = this;
		container = document.getElementById('container');
		mouseOffset.top = container.getBoundingClientRect().top;
		mouseOffset.left = container.getBoundingClientRect().left;
		//defaultMat = new THREE.MeshLambertMaterial({map: new THREE.Texture(backgroundSinglePixelCanvas),transparent: true });
		//defaultMat = new THREE.MeshLambertMaterial({color: 0xAAAAAA,transparent: true });
		//defaultMat = new THREE.MeshStandardMaterial({color: 0xcccccc,side: THREE.FrontSide});
		//defaultMat = new THREE.MeshPhongMaterial( { color: 0xAAAAAA  } );
		defaultMat = new THREE.MeshLambertMaterial({color:0xCCCCCC,wireframe: false,side:THREE.DoubleSide });
		//defaultMat = new THREE.MeshPhongMaterial( { color: 0xBBBBBB, specular: 0x111111, shininess: 200 } );

		renderer = new THREE.WebGLRenderer();
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.clientWidth, container.clientHeight );
		container.appendChild( renderer.domElement );
		camera = new THREE.PerspectiveCamera( 50, container.clientWidth / container.clientHeight, 0.1, 20000 );
		mouse = new THREE.Vector2();
		raycaster = new THREE.Raycaster();
		controls = new TrackballControls( camera, renderer.domElement );
		directionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
		camera.add(directionalLight);
		pointLight = new THREE.PointLight(0xffffff, 0.3);
		camera.add(pointLight);
		ambientLight = new THREE.AmbientLight(0x202020);
		camera.add(ambientLight);

		scene = new THREE.Scene();
		scene.background = new THREE.Color( sceneBgColor );
		scene.add( camera );

		initScene();
		window.addEventListener( 'resize', onWindowResize, false );
		document.addEventListener( 'mousemove', onDocumentMouseMove, false );
		document.addEventListener( 'mousedown', onDocumentMouseDown, false );
		document.addEventListener( 'mouseup', onDocumentMouseUp, false );
		document.addEventListener( 'keydown', onDocumentKeyDown, false );
		document.addEventListener( 'keyup', onDocumentKeyUp, false );
		document.addEventListener( 'contextmenu', function (e) {	e.preventDefault();	}, false );
		animate();
	}

	function getBrushColor() {
		return (new THREE.Color(vue.guiParam.brushColor )).getHex();
	}

	function getBrushSize() {
		return vue.guiParam.brushSize/vue.guiParam.multiple;
	}

	function alertBox(txt){
		vue.$Modal.error({ title: 'Warn',   content: txt});
	}

	function setPaint(intersect) {
		var voxel = new THREE.Mesh( circleGeo, circleMaterial );
		voxel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), intersect.face.normal);
		prePoint = intersect.point;
		voxel.position.copy( intersect.point );
		voxel.name = 'mark_'+markObjects.length ;
		scene.add( voxel );
		markObjects.push( voxel );
	}

	function onDocumentMouseMove( event ) {
		if( !isShiftDown || !vue.guiParam.enableMark ){
			return ;
		}
		event.preventDefault();
		mouse.x = ( (event.clientX-mouseOffset.left) / renderer.domElement.clientWidth ) * 2 - 1;
		mouse.y = - ( (event.clientY-mouseOffset.top) / renderer.domElement.clientHeight ) * 2 + 1;
		raycaster.setFromCamera( mouse, camera );
		var sceneObjects = markObjects.concat(modelMesh);
		var intersects = raycaster.intersectObjects( sceneObjects );

		if ( intersects.length > 0 ) {
			var intersect = intersects[ 0 ];
			brushMesh.position.copy( intersect.point );
			if( mouseDown && mouseRightDown && intersect.object !== modelMesh
				&& markObjects.indexOf( intersect.object )>-1 ){ 
				scene.remove( intersect.object );
				markObjects.splice( markObjects.indexOf( intersect.object ), 1 );
			}else if(mouseDown && !mouseRightDown && intersect.object === modelMesh
				&& prePoint !=null
				&& pointDistanceThan(prePoint,intersect.point,getBrushSize() *0.2) ){
				setPaint(intersect);
			}
		}
	}

	function onDocumentMouseDown( event ) {
		//event.preventDefault();
		if( event.target.nodeName.toLowerCase()=='canvas' && controls.autoRotate ){
			controls.autoRotate = false;
			vue.guiParam.autoRotate = false;
		}
		if( !isShiftDown || !vue.guiParam.enableMark ){
			return ;
		}
		mouseDown = true;
		mouse.x = ( (event.clientX-mouseOffset.left) / renderer.domElement.clientWidth ) * 2 - 1;
		mouse.y = - ( (event.clientY-mouseOffset.top) / renderer.domElement.clientHeight ) * 2 + 1;
		raycaster.setFromCamera( mouse, camera );
		var sceneObjects = markObjects.concat(modelMesh);
		var intersects = raycaster.intersectObjects( sceneObjects );
		if ( intersects.length > 0 ) {
			var intersect = intersects[ 0 ];
			if ( event.button ==2 ) { 
				mouseRightDown = true;
				if ( intersect.object !== modelMesh && markObjects.indexOf( intersect.object )>-1 ) {
					scene.remove( intersect.object );
					markObjects.splice( markObjects.indexOf( intersect.object ), 1 );
				}
			} else {
				mouseRightDown = false;
				if( intersect.object === modelMesh ){
					setPaint(intersect);
				}
			}
		}
	}

	function onDocumentMouseUp( event ) {
		//event.preventDefault();
		mouseDown = false;
		mouseRightDown = false;
	}

	function onDocumentKeyDown( event ) {
		switch ( event.keyCode ) {
			case 16: // shift
			case 17: // ctrl
				isShiftDown = true;
				break;
		}
	}

	function onDocumentKeyUp( event ) {
		switch ( event.keyCode ) {
			case 16: // shift
			case 17: // ctrl
				isShiftDown = false;
				break;
		}
	}

	function onWindowResize() {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( container.clientWidth, container.clientHeight );
	}

	function pointDistanceThan(point1,point2,distance) {
		if( Math.abs(point1.x-point2.x) >= distance ){
			return true;
		}
		if( Math.abs(point1.y-point2.y) >= distance ){
			return true;
		}
		if( Math.abs(point1.z-point2.z) >= distance ){
			return true;
		}
		return false;
	}

	function animate() {
		requestAnimationFrame( animate );
		render();
	}

	function render() {
		controls.enabled = !isShiftDown;
		controls.update();
		if(brushMesh){
			brushMesh.visible = isShiftDown && vue.guiParam.enableMark ;
		}
		renderer.render( scene, camera );
	}

	function initScene(){
		camera.position.set(0,0,100);
		camera.lookAt( 0, 0, 0 );

		directionalLight.position.x = 1;
		directionalLight.position.y = 1;
		directionalLight.position.z = 2;
		directionalLight.position.normalize();

		pointLight.position.x = 0;
		pointLight.position.y = -25;
		pointLight.position.z = 10;

		if( modelMesh ){
			scene.remove(modelMesh);
		}
		clearMarks();
		controls.reset();
	}

	function clearMarks() {
		if( markObjects.length >0 ){
			for ( var i = 0, l = markObjects.length; i < l; i ++ ) {
				scene.remove(markObjects[i]);
			}
			markObjects = [];
		}
	}

	function resetPosition() {
		controls.resetPosition();
	}

	function initGui() {
		if( !_this.model.size ){
			return ;
		}
		vue.guiParam.multiple = 1;
		vue.guiParam.autoRotate = true;
		var tmp = brushSize;
		while (tmp<100){
			vue.guiParam.multiple = vue.guiParam.multiple *10;
			tmp = brushSize * vue.guiParam.multiple;
		}

		vue.setBrushSize( Math.ceil(brushSize * vue.guiParam.multiple) );
		controls.autoRotate = vue.guiParam.autoRotate;
	}

	function setBrush(_brushSize,_brushColor) {
		circleGeo = new THREE.CylinderBufferGeometry(_brushSize,_brushSize,_brushSize/5,16);
		circleMaterial = new THREE.MeshBasicMaterial( { color: _brushColor } );
		var brushMaterial = new THREE.MeshBasicMaterial( { color: _brushColor, opacity: 0.5, transparent: true,wireframe:true  } );
		sceneRemoveByName('brushMesh');
		var brushMeshGeo = new THREE.SphereBufferGeometry(_brushSize, 16, 16);
		brushMesh = new THREE.Mesh( brushMeshGeo, brushMaterial );
		brushMesh.name = 'brushMesh';
		scene.add( brushMesh );
	}

	function sceneRemoveByName(name) {
		if( scene.children ){
			for ( var i = 0, l = scene.children.length; i < l; i ++ ) {
				var child = scene.children[ i ];
				if ( child.name === name ) {
					scene.remove( child );
					return;
				}
			}
		}
	}

	function setMarkObjectsShow(isShow) {
		for ( var i = 0, l = markObjects.length; i < l; i ++ ) {
			markObjects[ i ].visible = isShow;
		}
	}

	function addObjectToScene(geometry){
		initScene();
		if( !geometry.isGeometry ){
			return;
		}
		geometry.computeBoundingBox();
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();
		geometry.center();
		modelMesh = new THREE.Mesh( geometry, defaultMat );
		modelMesh.name = 'modelMesh';
		scene.add( modelMesh );
		if( marksFromModel.length>0 ){
			for ( var i = 0, l = marksFromModel.length; i < l; i++ ) {
				scene.add(marksFromModel[i]);
			}
			marksFromModel = [];
		}

		directionalLight.position.x = geometry.boundingBox.min.y * 2;
		directionalLight.position.y = geometry.boundingBox.min.y * 2;
		directionalLight.position.z = geometry.boundingBox.max.z * 2;
		pointLight.position.x = (geometry.boundingBox.min.y+geometry.boundingBox.max.y)/2;
		pointLight.position.y = (geometry.boundingBox.min.y+geometry.boundingBox.max.y)/2;
		pointLight.position.z = geometry.boundingBox.max.z * 2;
		camera.position.set(0,0,Math.max(geometry.boundingBox.max.x*3,geometry.boundingBox.max.y*3,geometry.boundingBox.max.z*3));
		var maxDim = Math.max(geometry.boundingBox.max.x - geometry.boundingBox.min.x
			, geometry.boundingBox.max.y - geometry.boundingBox.min.y
			, geometry.boundingBox.max.z - geometry.boundingBox.min.z);
		if( maxDim==0 ){
			alertBox('Model demention error!');
			return;
		}
		brushSize = maxDim/200;
		initGui();
		setBrush(getBrushSize(), getBrushColor());
		isLoadedModel = true;
		if( _this.onModelshow && typeof(_this.onModelshow)=='function' ){
			_this.onModelshow();
		}
		controls.initPosition();
	}

	function isModel(type) {
		return new RegExp('(gltf|glb|obj|stl)$').test(type);
	}

	function loadModel(model){
		var data = model.data || model.url;
		var type = model.type;
		//var file = model.file;
		var loader = null;
		_this.model = model;
		switch (type) {
			case 'stl':
				loader = new STLLoader();
				break;
			case 'obj':
				loader = new OBJLoader();
				break;
			case 'gltf':
			case 'glb':
				loader = new GLTFLoader();
				break;
			default:
				onError('Unsupported data type ' + type + ' - please load one of the supported model formats.');
		}
		if( loader != null ){
			// loader.load(data,onModelLoaded,onLoadProgress,onLoadModelError);
			loader.load(data,onModelLoaded, onLoadModelError);
		}
	}

	function loadMark(marksize,markurl) {
		_this.model.size = marksize;
		// new GLTFLoader().load(markurl,function (data) { loadMarks(data); },onLoadProgress,onLoadModelError);
		new GLTFLoader().load(markurl,function (data) { loadMarks(data); }, onLoadModelError);
	}

	function getMergedGeometry(result) {
		if( result.isGeometry ){
			return result;
		} else if( result.isBufferGeometry ){
			return (new THREE.Geometry().fromBufferGeometry(result));
		} else if(result.geometry && result.geometry.isGeometry){
			return result.geometry; //cccccccccccccccc
		} else if(result.geometry && result.geometry.isBufferGeometry){
			return (new THREE.Geometry().fromBufferGeometry(result));
		} else if((result.isObject3D || result.isGroup || result.isScene) && result.children){
			if( result.children.length ==1 && result.children[0] instanceof THREE.Mesh ){
				result.children[0].geometry.faceVertexUvs = [[]];
				return ( new THREE.Geometry().fromBufferGeometry(result.children[0].geometry) );
			}else if( result.children.length >1 ){
				var geometry = new THREE.Geometry();
				result.children.forEach(function (child) {
					if(child instanceof THREE.Mesh ){
						var mesh = child;
						mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
						mesh.geometry.faceVertexUvs = [[]];
						mesh.updateMatrix();
						geometry.merge(mesh.geometry,mesh.matrix);
					}
				});
				return geometry;
			}
		} else if(result.scenes && result.scenes.length >0){
			var geometry = new THREE.Geometry();
			result.scenes.forEach(function(scene) {
				if( scene.children ){
					scene.children.forEach(function (child) {
						if(child.name && child.name.indexOf('mark_') == 0){
							marksFromModel.push( child );
							return;
						}
						if(child instanceof THREE.Mesh ){
							var mesh = child;
							mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
							mesh.geometry.faceVertexUvs = [[]];
							mesh.updateMatrix();
							geometry.merge(mesh.geometry,mesh.matrix);
						}else if( child.children ){
							child.children.forEach(function (ch) {
								if(ch instanceof THREE.Mesh ){
									var mesh = ch;
									mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
									mesh.geometry.faceVertexUvs = [[]];
									mesh.updateMatrix();
									geometry.merge(mesh.geometry,mesh.matrix);
								}
							});
						}
					});
				}
			});
			return geometry;
		} else if( result instanceof Array && result[0] instanceof THREE.Mesh ){
			var geometry = new THREE.Geometry();
			result.forEach(function (child) {
				var mesh = child;
				if( mesh.geometry.index && mesh.geometry.index.array ){
					mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
				}
				mesh.geometry.faceVertexUvs = [[]];
				mesh.updateMatrix();
				geometry.merge(mesh.geometry,mesh.matrix);
			});
			return geometry;
		}
		return false;
	}

	function onModelLoaded (result) {
		// setProgressBar(100);
		var geo = getMergedGeometry(result);
		if(!geo){
			alertBox('No object found in file!');
			// setProgressBar(0);
			return ;
		}
		addObjectToScene(geo);
	}

	function onVueStateChange() {
		setBrush(getBrushSize(), getBrushColor());
		controls.autoRotate = vue.guiParam.autoRotate;
	}

	// function onLoadStart () {
	// 	timerID = setInterval(function() {
	// 		percentComplete += 5;
	// 		setProgressBar(percentComplete);
	// 	}, 100);
	// }

	// function onLoadProgress (event, itemsLoaded, itemsTotal) {
	// 	var loaded = event.loaded || itemsLoaded;
	// 	var total = event.total || itemsTotal || _this.model.size;
	// 	if( total ){
	// 		percentComplete = Math.floor(loaded/total *100) ;
	// 		var txt = utils.getFileSizeTxt(loaded)+'/'+utils.getFileSizeTxt(total) ;
	// 		setProgressBar(percentComplete,txt);
	// 	}else{
	// 		setProgressBar(++percentComplete);
	// 	}
	// }

	function onError (errObj) {
		// setProgressBar(0);
		if( typeof errObj == 'object' ){
			alertBox(''+errObj);
			console.error(errObj);
		}else{
			alertBox(errObj);
		}
	}

	function onLoadModelError(errObj) {
		// setProgressBar(0);
		alertBox("3D model data load error!");
		console.error(errObj);
	}

	function getCanvasImg (sidelen,type) { //type:  model , mark , all
		if(!sidelen){
			alertBox('No side length!');
			return;
		}
		type = type || 'all';
		scene.background = new THREE.Color( 0xffffff );
		if( type == 'model' ){
			setMarkObjectsShow(false);
		}
		var renderer2 = new THREE.WebGLRenderer({preserveDrawingBuffer:true,antialias:true});
		renderer2.setPixelRatio( window.devicePixelRatio );
		renderer2.setSize( container.clientWidth/3, container.clientHeight/3 );
		renderer2.render( scene, camera );

		var canvas = renderer2.domElement;
		var w = canvas.width,
			h = canvas.height;
		var retCanvas = document.createElement('canvas');
		retCanvas.width = sidelen;
		retCanvas.height = sidelen;
		var retCtx = retCanvas.getContext('2d');
		retCtx.fillStyle = '#ffffff';
		retCtx.fillRect(0,0,retCanvas.width,retCanvas.height);
		if( w>h ){
			var sx = (w-h)/2;
			var sy = 0;
			var sw = h;
			var sh = h;
		}else{
			var sx = 0;
			var sy = (h-w)/2;
			var sw = w;
			var sh = w;
		}
		retCtx.drawImage(canvas, sx , sy, sw, sh, 0, 0, sidelen, sidelen);
		var str = retCanvas.toDataURL('image/png');
		scene.background = new THREE.Color( sceneBgColor );
		if( type == 'model' ){
			setMarkObjectsShow(true);
		}
		return str;
	}

	function getMarksGLTF (callback) {
		if( !markObjects.length ){
			callback(false);
			return ;
		}
		//console.log(markObjects);
		var gltfExporter = new GLTFExporter();
		gltfExporter.parse( markObjects, ( result )=> {
			var output = JSON.stringify( result, null, 2 );
			callback( output);
		});
	}

	function getMarksSTL (callback) {
		if( !markObjects.length ){
			callback(false);
			return ;
		}
		var output = new THREE.Mesh( getMergedGeometry(markObjects),defaultMat );
		var result = new STLExporter().parse( output , { binary: true } ); //
		callback( result);
	}

	function getModelMarksGLB (callback) {
		if( !markObjects.length ){
			callback(false);
			return ;
		}
		//console.log(markObjects);
		var gltfExporter = new GLTFExporter();
		gltfExporter.parse( markObjects.concat(modelMesh), ( result )=> {
			callback( result);
		},{binary:true });
	}

	function getModelMarksSTL (callback) {
		if( !markObjects.length ){
			callback(false);
			return ;
		}
		var output = new THREE.Mesh( getMergedGeometry(markObjects.concat(modelMesh)),defaultMat );
		var result = new STLExporter().parse( output , { binary: true } );
		callback( result);
	}

	function loadMarks (data){
		var result = data.scene || data.scenes[0];
		var curlen = markObjects.length;
		if(result && result.children){
			result.children.forEach(function (child) {
				if(child instanceof THREE.Mesh ){
					child.name = 'mark_'+markObjects.length;
					markObjects.push( child );
				}else if( child.children ){
					child.children.forEach(function (ch) {
						if(ch instanceof THREE.Mesh ){
							ch.name = 'mark_'+markObjects.length;
							markObjects.push( ch );
						}
					});
				}
			});
		}
		for ( var i = curlen, l = markObjects.length; i < l; i++ ) {
			scene.add(markObjects[i]);
		}
	}

	Main.prototype = {
		model: {},
		onModelshow: null,

		onVueStateChange: onVueStateChange,
		onModelLoaded : onModelLoaded,
		// onLoadStart : onLoadStart ,
		// onLoadProgress : onLoadProgress ,
		onError : onError ,
		getCanvasImg : getCanvasImg ,
		getMarksGLTF : getMarksGLTF ,
		loadMarks : loadMarks,
		isModel: isModel,
		loadModel:loadModel,
		clearMarks:clearMarks,
		resetPosition:resetPosition,
		loadMark:loadMark,
		getModelMarksGLB:getModelMarksGLB,
		getMarksSTL:getMarksSTL,
		getModelMarksSTL:getModelMarksSTL,
	}

	return Main;
})();


export default Main;

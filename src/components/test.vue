<template>
  <div id="page">
    <div style="position: fixed; left:30px; top:30px;height:240px;width:240px;box-shadow:0px 0px 10px #000;">
      <img :src="snapshot"/>
    </div>
    <div style="height:10%;">
      <input id="fileSTL" type="file" name="file" @input="importSTL"/>
      <button @click="autorotate">自动旋转</button>
      <button @click="stopautorotate">停止自动旋转</button>
      <label>大小:</label>
      <input id="urange" type="range" :value="r_brushSize" :min="brushSizeMin" :max="brushSizeMax" :step="brushSizeStep" @input="onChangeBrushColor">
      <label>颜色:</label>
      <input id="ucolor" type="color" :value="brushColor" @input="onChangeBrushColor"/>
      <label style="font-size:8pt;">按住shift或者ctrl进行标注</label>
      <select v-model="select2" @change="seleteVal">
        <option value="">--请选择--</option>
        <option v-for="item in optionList" :key="item">{{ item }}</option>
      </select>
      <input id="srange" type="range" :value="r_section" :min="sectionSizeMin" :max="sectionSizeMax" :step="sectionSizeStep" @input="onChangeSection">
      <button @click="distance">测量空间距离</button>
      <button @click="delMark">删除标注</button>
      <button @click="saveimage">获取快照</button>
      <button @click="exportSTL">保存模型到本地</button>
      <a href="" id="downlink" style="display: none;"></a>
    </div>
    <div id="container"></div>
  </div>
</template>
<script>
  import * as THREE from 'three'
  import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
  import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
  import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
  import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
  import { TrackballControls } from '@/assets/js/three_TrackballControlsTH.js'
  // import { GUI } from "./jsm/libs/dat.gui.module.js"

  const OrbitControls = require('three-orbit-controls')(THREE);

  let scene = ''
  let controls = ''
  let renderer = ''
  let camera = ''
  let mouse = ''
  let directionalLight = ''
  let ambientLight = ''
  let pointLight = ''
  let raycaster = ''
  let modelMesh = ''
  let markObjects = []
  let marksFromModel = []
  let prePoint = ''
  let circleGeo = ''
  let circleMaterial = ''
  let brushMesh = ''
  let defaultMat = ''
  let sceneBgColor = 0x333333
  let brushSize = 2
  let mouseOffset = {
    top: 0,
    left: 0
  }
  let isLoadedModel = false
  let isShiftDown = false
  let mouseDown = false
  let mouseRightDown = false
  let font = ''
  let PlaneArr = []

  export default {
    name: "vue-three",
    data() {
      return {
        enableMark:true,
        autoRotate: true,
        brushColor: '#EA1A1A',
        r_brushSize: 2,
        brushSizeMin: 2,
        brushSizeMax: 200,
        brushSizeStep: 2,
        multiple: 1,
        snapshot: '',
        select2: '',
        optionList: ['x轴这边', 'x轴那边', 'y轴这边', 'y轴那边', 'z轴这边', 'z轴那边'],
        r_section: 0,
        sectionSizeMin: 0,
        sectionSizeMax: 100,
        sectionSizeStep: 1
      }
    },
    methods: {
      onChangeBrushColor(){
        const color = document.getElementById('ucolor')
        this.brushColor = color.value
        const num = document.getElementById('urange')
        this.r_brushSize = num.value
        this.onVueStateChange()
      },
      autorotate () {
        this.autoRotate = true
        controls.autoRotate = this.autoRotate
      },
      stopautorotate () {
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
      },
      getBrushColor () {
        return (new THREE.Color(this.brushColor)).getHex()
      },
      getBrushSize () {
        return this.r_brushSize / this.multiple
      },
      //初始化three.js相关内容
      init() {
        const container = document.getElementById('container')
        mouseOffset.top = container.getBoundingClientRect().top
        mouseOffset.left = container.getBoundingClientRect().left
        defaultMat = new THREE.MeshLambertMaterial({
          color:0xCCCCCC,
          wireframe: false,
          side:THREE.DoubleSide 
        });

        renderer = new THREE.WebGLRenderer()
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(container.clientWidth, container.clientHeight)
        // 开启模型对象的局部剪裁平面功能，如果不设置为true，设置剪裁平面的模型不会被剪裁
        renderer.localClippingEnabled = true
        container.appendChild(renderer.domElement)
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 20000)
        mouse = new THREE.Vector2()
        raycaster = new THREE.Raycaster()
        controls = new TrackballControls(camera, renderer.domElement)
        directionalLight = new THREE.DirectionalLight(0xffffff, 0.75)
        camera.add(directionalLight)
        pointLight = new THREE.PointLight(0xffffff, 0.3)
        camera.add(pointLight)
        ambientLight = new THREE.AmbientLight(0x202020)
        camera.add(ambientLight)
        scene = new THREE.Scene()
        scene.background = new THREE.Color(sceneBgColor)
        scene.add(camera)

        // xyz辅助坐标轴
        // var axes = new THREE.AxisHelper(50)
        // scene.add(axes)
        // xyz辅助坐标轴

        this.initScene()
        window.addEventListener('resize', this.onWindowResize, false)
        document.addEventListener('mousemove', this.onDocumentMouseMove, false)
        document.addEventListener('mousedown', this.onDocumentMouseDown, false)
        document.addEventListener('mouseup', this.onDocumentMouseUp, false)
        document.addEventListener('keydown', this.onDocumentKeyDown, false)
        document.addEventListener('keyup', this.onDocumentKeyUp, false)
        document.addEventListener('contextmenu', function (e) {
          e.preventDefault()
        }, false)
        this.animate()
      },

      initScene () {
        camera.position.set(0,0,100)
        camera.lookAt(0, 0, 0)
        directionalLight.position.x = 1
        directionalLight.position.y = 1
        directionalLight.position.z = 2
        directionalLight.position.normalize()
        pointLight.position.x = 0
        pointLight.position.y = -25
        pointLight.position.z = 10
        if(modelMesh){
          scene.remove(modelMesh)
        }
        this.clearMarks()
        controls.reset()
      },
      clearMarks () {
        if(markObjects.length>0){
          for (var i = 0, l = markObjects.length; i < l; i++) {
            scene.remove(markObjects[i])
          }
          markObjects = []
        }
      },
      animate () {
        requestAnimationFrame(this.animate);
        this.render()
      },
      onVueStateChange () {
        this.setBrush(this.getBrushSize(), this.getBrushColor())
        controls.autoRotate = this.autoRotate
      },

      onDocumentMouseMove (event) {
        if( !isShiftDown || !this.enableMark ){
          return 
        }
        event.preventDefault()
        mouse.x = ((event.clientX-mouseOffset.left) / renderer.domElement.clientWidth) * 2 - 1
        mouse.y = -((event.clientY-mouseOffset.top) / renderer.domElement.clientHeight) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        var sceneObjects = markObjects.concat(modelMesh)
        var intersects = raycaster.intersectObjects(sceneObjects)

        if (intersects.length > 0) {
          var intersect = intersects[0]
          brushMesh.position.copy(intersect.point)
          if(mouseDown && mouseRightDown && intersect.object !== modelMesh
            && markObjects.indexOf(intersect.object)>-1){ 
            scene.remove(intersect.object)
            markObjects.splice(markObjects.indexOf(intersect.object), 1)
          }else if(mouseDown && !mouseRightDown && intersect.object === modelMesh
            && prePoint !=null
            && this.pointDistanceThan(prePoint,intersect.point,this.getBrushSize()*0.2)){
            this.setPaint(intersect)
          }
        }
      },
      onDocumentMouseDown (event) {
        if(event.target.nodeName.toLowerCase()=='canvas' && controls.autoRotate){
          controls.autoRotate = false
          this.autoRotate = false
        }
        if(!isShiftDown || !this.enableMark){
          return
        }
        mouseDown = true;
        mouse.x = ((event.clientX-mouseOffset.left) / renderer.domElement.clientWidth) * 2 - 1
        mouse.y = - ((event.clientY-mouseOffset.top) / renderer.domElement.clientHeight) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        var sceneObjects = markObjects.concat(modelMesh)
        var intersects = raycaster.intersectObjects(sceneObjects)
        if (intersects.length > 0) {
          var intersect = intersects[0]
          if (event.button == 2) { 
            mouseRightDown = true
            if (intersect.object !== modelMesh && markObjects.indexOf(intersect.object)>-1) {
              scene.remove(intersect.object)
              markObjects.splice(markObjects.indexOf(intersect.object), 1)
            }
          } else {
            mouseRightDown = false
            if(intersect.object === modelMesh){
              this.setPaint(intersect)
            }
          }
        }
      },
      onDocumentMouseUp (event) {
        mouseDown = false
		    mouseRightDown = false
      },
      onDocumentKeyDown (event) {
        switch (event.keyCode) {
          case 16: // shift
          case 17: // ctrl
            isShiftDown = true
            break
        }
      },
      onDocumentKeyUp (event) {
        switch (event.keyCode) {
          case 16: // shift
          case 17: // ctrl
            isShiftDown = false
            break
        }
      },
      setPaint(intersect) {
        var voxel = new THREE.Mesh(circleGeo, circleMaterial)
        voxel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), intersect.face.normal)
        prePoint = intersect.point
        voxel.position.copy(intersect.point)
        voxel.name = 'mark_'+markObjects.length
        scene.add(voxel)
        markObjects.push(voxel)
      },
      pointDistanceThan(point1,point2,distance) {
        if(Math.abs(point1.x-point2.x) >= distance){
          return true
        }
        if(Math.abs(point1.y-point2.y) >= distance){
          return true
        }
        if(Math.abs(point1.z-point2.z) >= distance){
          return true
        }
        return false
      },

      updateScreenPosition (x, y, z) {
        // 世界坐标转平面坐标
        var vector = new THREE.Vector3(x, y, z)
        var canvas1 = renderer.domElement
        vector.project(camera)
        vector.x = Math.round((0.5 + vector.x / 2) * window.innerWidth)
        vector.y = Math.round((0.5 - vector.y / 2) * window.innerHeight)
        return [vector.x, vector.y]
      },
      addText (x,y,z,text) {
        var textObj = this.makeTextSprite(text,{
          fontsize: 100,
          borderColor: {r:255, g:0, b:0, a:0.4},/* 边框黑色 */
          backgroundColor: {r:255, g:255, b:255, a:0.9}/* 背景颜色 */
        });
        textObj.center = new THREE.Vector2(0, 0);
        textObj.position.set(x, y, z)

        scene.add(textObj)
      },
      /* 创建字体精灵 */
      makeTextSprite(message, parameters) {
        if ( parameters === undefined ) parameters = {};
        var fontface = parameters.hasOwnProperty("fontface") ?
            parameters["fontface"] : "Arial";
        /* 字体大小 */
        var fontsize = parameters.hasOwnProperty("fontsize") ?
            parameters["fontsize"] : 18;
        /* 边框厚度 */
        var borderThickness = parameters.hasOwnProperty("borderThickness") ?
            parameters["borderThickness"] : 5;
        /* 边框颜色 */
        var borderColor = parameters.hasOwnProperty("borderColor") ?
            parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
        /* 背景颜色 */
        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
            parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
        /* 创建画布 */
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        /* 字体加粗 */
        context.font = "Bold " + fontsize + "px " + fontface;
        /* 获取文字的大小数据，高度取决于文字的大小 */
        var metrics = context.measureText( message );
        var textWidth = metrics.width;
        /* 背景颜色 */
        context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
            + backgroundColor.b + "," + backgroundColor.a + ")";
        /* 边框的颜色 */
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
            + borderColor.b + "," + borderColor.a + ")";
        context.lineWidth = borderThickness;
        /* 绘制圆角矩形 */
        this.roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
        /* 字体颜色 */
        context.fillStyle = "rgba(0, 0, 0, 1.0)";
        context.fillText( message, borderThickness, fontsize + borderThickness);
        /* 画布内容用于纹理贴图 */
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        var spriteMaterial = new THREE.SpriteMaterial({ map: texture } );
        var sprite = new THREE.Sprite( spriteMaterial );
        /* 缩放比例 */
        sprite.scale.set(10,5,0);
        return sprite;
      },
      /* 绘制圆角矩形 */
      roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      },

      // 窗口监听函数
      onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      },
      animate() {
        requestAnimationFrame(this.animate)
        this.render()
      },
      render() {
        controls.enabled = !isShiftDown
        controls.update()
        if(brushMesh){
          brushMesh.visible = isShiftDown && this.enableMark
        }
        renderer.render(scene, camera)
      },
      setBrush(_brushSize,_brushColor) {
        circleGeo = new THREE.CylinderBufferGeometry(_brushSize,_brushSize,_brushSize/5,16)
        circleMaterial = new THREE.MeshBasicMaterial({color: _brushColor})
        var brushMaterial = new THREE.MeshBasicMaterial({color: _brushColor, opacity: 0.5, transparent: true,wireframe:true})
        this.sceneRemoveByName('brushMesh')
        var brushMeshGeo = new THREE.SphereBufferGeometry(_brushSize, 16, 16)
        brushMesh = new THREE.Mesh(brushMeshGeo, brushMaterial)
        brushMesh.name = 'brushMesh'
        scene.add(brushMesh)
      },
      sceneRemoveByName (name) {
        if(scene.children){
          for (var i = 0, l = scene.children.length; i < l; i ++) {
            var child = scene.children[ i ]
            if (child.name === name) {
              scene.remove(child)
              return
            }
          }
        }
      },
      setBrushSize(size){
        this.r_brushSize = size
        this.brushSizeMin = 2
        this.brushSizeMax = this.r_brushSize * 6
        this.brushSizeStep = 2
      },
      initGui () {
        this.multiple = 1
        this.autoRotate = true
        var tmp = this.r_brushSize
        while (tmp<100){
          this.multiple = this.multiple *10
          tmp = brushSize * this.multiple
        }

        this.setBrushSize(Math.ceil(brushSize * this.multiple))
        controls.autoRotate = this.autoRotate
      },
      getMergedGeometry(result) {
        if(result.isGeometry){
          return result
        } else if( result.isBufferGeometry ){
          return (new THREE.Geometry().fromBufferGeometry(result))
        } else if(result.geometry && result.geometry.isGeometry){
          return result.geometry
        } else if(result.geometry && result.geometry.isBufferGeometry){
          return (new THREE.Geometry().fromBufferGeometry(result))
        } else if((result.isObject3D || result.isGroup || result.isScene) && result.children){
          if( result.children.length ==1 && result.children[0] instanceof THREE.Mesh ){
            result.children[0].geometry.faceVertexUvs = [[]]
            return (new THREE.Geometry().fromBufferGeometry(result.children[0].geometry))
          }else if(result.children.length >1){
            var geometry = new THREE.Geometry()
            result.children.forEach(function (child) {
              if(child instanceof THREE.Mesh){
                var mesh = child
                mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry)
                mesh.geometry.faceVertexUvs = [[]]
                mesh.updateMatrix()
                geometry.merge(mesh.geometry,mesh.matrix)
              }
            });
            return geometry
          }
        } else if(result.scenes && result.scenes.length >0){
          var geometry = new THREE.Geometry()
          result.scenes.forEach(function(scene) {
            if(scene.children){
              scene.children.forEach(function (child) {
                if(child.name && child.name.indexOf('mark_') == 0){
                  marksFromModel.push(child)
                  return;
                }
                if(child instanceof THREE.Mesh){
                  var mesh = child
                  mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry)
                  mesh.geometry.faceVertexUvs = [[]]
                  mesh.updateMatrix()
                  geometry.merge(mesh.geometry,mesh.matrix)
                }else if(child.children){
                  child.children.forEach(function (ch) {
                    if(ch instanceof THREE.Mesh){
                      var mesh = ch
                      mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry)
                      mesh.geometry.faceVertexUvs = [[]]
                      mesh.updateMatrix()
                      geometry.merge(mesh.geometry,mesh.matrix)
                    }
                  });
                }
              });
            }
          });
          return geometry
        } else if(result instanceof Array && result[0] instanceof THREE.Mesh){
          var geometry = new THREE.Geometry()
          result.forEach(function (child) {
            var mesh = child
            if(mesh.geometry.index && mesh.geometry.index.array){
              mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
            }
            mesh.geometry.faceVertexUvs = [[]]
            mesh.updateMatrix()
            geometry.merge(mesh.geometry,mesh.matrix)
          });
          return geometry
        }
        return false
      },
      onModelLoaded (result) {
        var geo = this.getMergedGeometry(result)
        if(!geo){
          return
        }
        this.addObjectToScene(geo)
      },
      addObjectToScene (geometry) {
        this.initScene()
        if(!geometry.isGeometry){
          return
        }
        geometry.computeBoundingBox()
        geometry.computeFaceNormals()
        geometry.computeVertexNormals()
        geometry.center()
        modelMesh = new THREE.Mesh(geometry, defaultMat)
        modelMesh.name = 'modelMesh'
        scene.add(modelMesh)
        if(marksFromModel.length>0){
          for (var i = 0, l = marksFromModel.length; i < l; i++) {
            scene.add(marksFromModel[i])
          }
          marksFromModel = []
        }

        directionalLight.position.x = geometry.boundingBox.min.y * 2
        directionalLight.position.y = geometry.boundingBox.min.y * 2
        directionalLight.position.z = geometry.boundingBox.max.z * 2
        pointLight.position.x = (geometry.boundingBox.min.y+geometry.boundingBox.max.y)/2
        pointLight.position.y = (geometry.boundingBox.min.y+geometry.boundingBox.max.y)/2
        pointLight.position.z = geometry.boundingBox.max.z * 2
        camera.position.set(0,0,Math.max(geometry.boundingBox.max.x*3,geometry.boundingBox.max.y*3,geometry.boundingBox.max.z*3))
        var maxDim = Math.max(geometry.boundingBox.max.x - geometry.boundingBox.min.x
          , geometry.boundingBox.max.y - geometry.boundingBox.min.y
          , geometry.boundingBox.max.z - geometry.boundingBox.min.z)
        if(maxDim==0){
          alertBox('Model demention error!')
          return
        }
        brushSize = maxDim/200
        this.initGui()
        this.setBrush(this.getBrushSize(), this.getBrushColor())
        isLoadedModel = true
        if(this.onModelshow && typeof(this.onModelshow)=='function'){
          this.onModelshow()
        }
        controls.initPosition()
      },
      onLoadModelError(errObj) {
        console.error(errObj)
      },
      //外部模型加载函数
      loadStl(filepath) {
        //包含材质
        var loader = new STLLoader();
        loader.load(filepath, this.onModelLoaded, this.onLoadModelError)
      },

      setMarkObjectsShow(isShow) {
        for (var i = 0, l = markObjects.length; i < l; i ++) {
          markObjects[i].visible = isShow
        }
      },
      getCanvasImg (sidelen,type) {
        if(!sidelen){
          return
        }
        type = type || 'all'
        scene.background = new THREE.Color(0xffffff)
        if(type == 'model'){
          this.setMarkObjectsShow(false)
        }
        var renderer2 = new THREE.WebGLRenderer({preserveDrawingBuffer:true,antialias:true})
        renderer2.setPixelRatio(window.devicePixelRatio)
        renderer2.setSize(container.clientWidth/3, container.clientHeight/3)
        renderer2.render(scene, camera)

        var canvas = renderer2.domElement
        var w = canvas.width,
          h = canvas.height
        var retCanvas = document.createElement('canvas')
        retCanvas.width = sidelen
        retCanvas.height = sidelen
        var retCtx = retCanvas.getContext('2d')
        retCtx.fillStyle = '#ffffff'
        retCtx.fillRect(0,0,retCanvas.width,retCanvas.height)
        if( w>h ){
          var sx = (w-h)/2
          var sy = 0
          var sw = h
          var sh = h
        }else{
          var sx = 0
          var sy = (h-w)/2
          var sw = w
          var sh = w
        }
        retCtx.drawImage(canvas, sx , sy, sw, sh, 0, 0, sidelen, sidelen);
        var str = retCanvas.toDataURL('image/png');
        scene.background = new THREE.Color(sceneBgColor);
        if( type == 'model' ){
          this.setMarkObjectsShow(true);
        }
        return str
      },
      saveimage () {
        const image = this.getCanvasImg(240, 'mark')
        this.snapshot = image
      },

      getMarksSTL (callback) {
        if(!markObjects.length){
          callback(false)
          return
        }
        var output = new THREE.Mesh(this.getMergedGeometry(markObjects), defaultMat)
        var result = new STLExporter().parse(output, {binary: true})
        callback(result);
      },
      exportMarks () {
        this.getMarksSTL((outputStr) => {
          if(!outputStr){
            return 
          }
          var blob = new Blob([outputStr], {type:'application/octet-stream'})
          var downlink = document.getElementById('downlink')
          downlink.href = URL.createObjectURL(blob)
          downlink.download = 'exportMark.stl'
          downlink.click()
        })
      },
      exportSTL () {
        const result = new STLExporter().parse(modelMesh, {binary: true })
        var blob = new Blob([result], {type:'application/octet-stream'})
        var downlink = document.getElementById('downlink')
        downlink.href = URL.createObjectURL(blob)
        downlink.download = 'exportSTL.stl'
        downlink.click()
      },

      delMark () {
        if(!markObjects.length){
          return
        }
        this.clearMarks()
      },

      importSTL () {
        const fileName = document.getElementById('fileSTL')
        const fileType = fileName.value.substr(fileName.value.lastIndexOf('.')+1)
        if(fileType !== 'stl'){
          alert('不是STL')
          return
        }
        this.loadStl('../static/' + fileName.value.split('\\')[fileName.value.split('\\').length-1])
      },

      seleteVal(){
        // 获取对象盒子模型
        var Box = new THREE.Box3().setFromObject(modelMesh)
        // var point_max =new THREE.Vector3()
        // var point_max_right =new THREE.Vector3()
        // var point_max_behind =new THREE.Vector3()
        // var point_max_under =new THREE.Vector3()
        // var point_min =new THREE.Vector3()
        // var point_min_front =new THREE.Vector3()
        // var point_min_top =new THREE.Vector3()
        // var point_min_left =new THREE.Vector3()
        // point_max.set(Box.max.x,Box.max.y,Box.max.z)
        // point_max_right.set(Box.min.x,Box.max.y,Box.max.z)
        // point_max_under.set(Box.max.x,Box.max.y,Box.min.z)
        // point_max_behind.set(Box.max.x,Box.min.y,Box.max.z)
        // point_min.set(Box.min.x,Box.min.y,Box.min.z)
        // point_min_front.set(Box.min.x,Box.max.y,Box.min.z)
        // point_min_top.set(Box.min.x,Box.min.y,Box.max.z)
        // point_min_left.set(Box.max.x,Box.min.y,Box.min.z)

        // Plane作为元素创建数组，Plane的方向法向量、位置根据需要随意定义
        if(this.select2 === 'x轴这边'){
          this.r_section = parseInt(Box.max.x)
          this.sectionSizeMin = parseInt(Box.min.x)
          this.sectionSizeMax = parseInt(Box.max.x)
          PlaneArr = [
            //创建一个垂直x轴的平面
            new THREE.Plane(new THREE.Vector3(1,0,0), parseInt(Box.max.x)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.y)) + Math.abs(parseInt(Box.min.y))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if(this.select2 === 'x轴那边'){
          this.r_section = parseInt(Box.max.x)
          this.sectionSizeMin = parseInt(Box.min.x)
          this.sectionSizeMax = parseInt(Box.max.x)
          PlaneArr = [
            //创建一个垂直x轴的平面
            new THREE.Plane(new THREE.Vector3(-1,0,0),parseInt(Box.max.x)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.y)) + Math.abs(parseInt(Box.min.y))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if(this.select2 === 'y轴这边'){
          this.r_section = parseInt(Box.max.y)
          this.sectionSizeMin = parseInt(Box.min.y)
          this.sectionSizeMax = parseInt(Box.max.y)
          PlaneArr = [
            //创建一个垂直y轴的平面
            new THREE.Plane(new THREE.Vector3(0,1,0), parseInt(Box.max.y)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if(this.select2 === 'y轴那边'){
          this.r_section = parseInt(Box.max.y)
          this.sectionSizeMin = parseInt(Box.min.y)
          this.sectionSizeMax = parseInt(Box.max.y)
          PlaneArr = [
            //创建一个垂直y轴的平面
            new THREE.Plane(new THREE.Vector3(0,-1,0), parseInt(Box.max.y)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if(this.select2 === 'z轴这边'){
          this.r_section = parseInt(Box.max.z)
          this.sectionSizeMin = parseInt(Box.min.z)
          this.sectionSizeMax = parseInt(Box.max.z)
          PlaneArr = [
            //创建一个垂直z轴的平面
            new THREE.Plane(new THREE.Vector3(0,0,1), parseInt(Box.max.z)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if(this.select2 === 'z轴那边'){
          this.r_section = parseInt(Box.max.z)
          this.sectionSizeMin = parseInt(Box.min.z)
          this.sectionSizeMax = parseInt(Box.max.z)
          PlaneArr = [
            //创建一个垂直z轴的平面
            new THREE.Plane(new THREE.Vector3(0,0,-1), parseInt(Box.max.z)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
      },
      setHelper(planeArr, helperArea){
        var x = scene.getObjectByName('helper')
        if(x !== undefined){
          scene.remove(x)
        }
        var helper = new THREE.PlaneHelper(planeArr, helperArea, 0xffff00)
        scene.add(helper)
      },
      onChangeSection(){
        const section = document.getElementById('srange')
        PlaneArr[0].constant = section.value
      },

      distance(){
        // 模型空间距离测量
        var material = new THREE.LineBasicMaterial({color: 0xffff00})
        var geometry = new THREE.Geometry()
        var p1 = new THREE.Vector3(-10, 0, 10)
        var p2 = new THREE.Vector3(0, 10, 10)
        geometry.vertices.push(p1)
        geometry.vertices.push(p2)
        var line = new THREE.Line(geometry, material)
        scene.add(line)

        this.addText(0,10,10,this.toDistance(p1, p2))
      },
      toDistance(p1,p2) {
        var distance = p1.distanceTo(p2)
        return distance.toFixed(2)
      },

    },
    mounted () {
      this.init()
    }
  }
</script>

<style scoped>
#container{
  width: 1600px;
  margin: 0 auto;
  height: 800px;
  overflow: hidden;
}

.title{
  position: absolute;
  padding: 10px;
  background: rgba(255, 255, 255, 0.5);
  line-height: 1;
  border-radius: 5px;
}
</style>

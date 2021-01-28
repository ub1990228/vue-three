<template>
  <div id="page">
    <div style="position: fixed; left:200px; top:30px;height:240px;width:240px;box-shadow:0px 0px 10px #000;display:none;">
      <img :src="snapshot" />
    </div>
    <!-- <div class="tag" id="tag">
      <input id="text_tag" type="text" @keyup.enter="enterUP">
    </div> -->
    <div>
      <input id="fileSTL" type="file" name="file" @input="importMODEL" />
      <button @click="autorotate">自动旋转</button>
      <button @click="stopautorotate">停止自动旋转</button>
      <button @click="showPointModel">对象/点模型切换</button>
      <button @click="lookX1">X+</button>
      <button @click="lookX2">X-</button>
      <button @click="lookY1">Y+</button>
      <button @click="lookY2">Y-</button>
      <button @click="lookZ1">Z+</button>
      <button @click="lookZ2">Z-</button>
      <button @click="locationRes">位置还原</button>
      <label>大小:</label>
      <input id="urange" type="range" :value="r_brushSize" :min="brushSizeMin" :max="brushSizeMax" :step="brushSizeStep"
        @input="onChangeBrushColor">
      <label>标记颜色:</label>
      <input id="ucolor" type="color" :value="brushColor" @input="onChangeBrushColor" />
      <label>模型颜色:</label>
      <input id="mcolor" type="color" :value="MbrushColor" @input="onChangeMBrushColor" />
      <button @click="colorRes">颜色还原</button>
      <label style="font-size:8pt;">按住shift或者ctrl进行测量或标注</label>
      <select v-model="select2" @change="seleteVal">
        <option value="">--请选择--</option>
        <option v-for="item in optionList" :key="item">{{ item }}</option>
      </select>
      <input id="srange" type="range" :value="r_section" :min="sectionSizeMin" :max="sectionSizeMax"
        :step="sectionSizeStep" @input="onChangeSection">
      <button @click="addLabel">添加标签</button>
      <button @click="noAddLabel">停止添加标签</button>
      <button @click="distance">测量空间距离</button>
      <button @click="noDistance">停止测量空间距离</button>
      <button @click="angle">测量角度</button>
      <button @click="noAngle">停止测量角度</button>
      <button @click="surfaceArea">测量表面积</button>
      <button @click="noSurfaceArea">停止测量表面积</button>
      <button @click="delMark">删除所有标注</button>
      <button @click="delAllLabel">删除所有标签</button>
      <button @click="delAllDistance">删除所有距离</button>
      <button @click="delAllAngle">删除所有角度</button>
      <button @click="delAllArea">删除所有表面积</button>
      <button @click="saveimage">获取快照</button>
      <button @click="exportSTL">保存模型到本地</button>
      <a href="" id="downlink" style="display: none;"></a>
    </div>
    <div id="menu" class="tabs" style="float:left;">
      <nav>
        <a href="javascript:;" data-cont="tag" @click="clicktab" class="active">标记</a>
        <a href="javascript:;" data-cont="label" @click="clicktab">标签</a>
        <a href="javascript:;" data-cont="distance" @click="clicktab">距离</a>
        <a href="javascript:;" data-cont="angle" @click="clicktab">角度</a>
        <a href="javascript:;" data-cont="area" @click="clicktab">面积</a>
      </nav>
      <section id="tag">
      </section>
      <section class="cont" id="label">
      </section>
      <section class="cont" id="distance">
      </section>
      <section class="cont" id="angle">
      </section>
      <section class="cont" id="area">
      </section>
    </div>
    <div id="container" style="float:right;"></div>
  </div>
</template>
<script>
  import * as THREE from 'three'
  import {
    STLLoader
  } from 'three/examples/jsm/loaders/STLLoader'
  import {
    OBJLoader
  } from 'three/examples/jsm/loaders/OBJLoader'
  import {
    GLTFLoader
  } from 'three/examples/jsm/loaders/GLTFLoader.js'
  import {
    STLExporter
  } from 'three/examples/jsm/exporters/STLExporter.js'
  import {
    CSS2DObject,
    CSS2DRenderer
  } from 'three/examples/jsm/renderers/CSS2DRenderer'
  import {
    TrackballControls
  } from '@/assets/js/three_TrackballControlsTH.js'
  import {
    EffectComposer
  } from 'three/examples/jsm/postprocessing/EffectComposer'
  import {
    RenderPass
  } from 'three/examples/jsm/postprocessing/RenderPass'
  import {
    OutlinePass
  } from 'three/examples/jsm/postprocessing/OutlinePass'
  import {
    UnrealBloomPass
  } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

  const OrbitControls = require('three-orbit-controls')(THREE);

  let ModelType = false
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
  // 选中高光效果
  let composer = ''
  let renderPass = ''
  let outlinePass = ''
  // 标记
  let tagObjects = []
  let tagName = 0
  // 计算距离
  let tmp_pointsArray = [] // 记录当前点集
  let distancePointArray = []    // 记录场景测试距离的所有点集、线段、精灵标签
  let distanceLineArray = []
  let distanceSpriteArray = []
  let distanceArray = []  // 记录当前对象所有UUID
  let pointName = 0
  let disName = 0
  let CalDistance = false
  // 临时记录uuid，深度拷贝进distanceArray
  let tmp_distanceArray = {
    name:'',
    pointsArray:[],
    lineArray:'',
    elvesArray:''
  }
  // 计算角度
  let a_pointsArray = []
  let AnglePointArray = []    // 记录场景测试距离的所有点集、线段、精灵标签
  let AngleLineArray = []
  let AngleSpriteArray = []
  let AngleArray = []  // 记录当前对象所有UUID
  let CalAngle = false
  let aPointName = 0
  let angleName = 0
  // 临时记录uuid，深度拷贝进distanceArray
  let tmp_angleArray = {
    name:'',
    pointsArray:[],
    lineArray:'',
    elvesArray:''
  }
  // 计算表面积
  let CalArea = false
  let areaObjects = []
  let areaObjectsArray = []  // 记录所有的三角面片和精灵标签
  let areaSpriteArray = []
  let areaObjectArray = []  // 记录所有uuid
  let tmp_areaObjectuuid = {
    name: '',
    faceArray: [],
    elves: ''
  }
  let areaName = 0
  let faceName = 0
  // 添加标签
  let AddLabel = false
  let AddLabelLine = false
  let labelObjects = []
  let tmp_labelObjects = []
  let labelTextBox = []
  let labelRenderer = ''
  let labelIDNum = 0
  let tagLabelUUID = []
  let tagLabelName = 0
  // 用来记录所有数据
  let tagRecordModelData = [] // 记录标记数据
  let labelRecordModelData = []  // 记录标签数据

  export default {
    name: 'vue-three',
    data() {
      return {
        enableMark: true,
        autoRotate: true,
        brushColor: '#EA1A1A',
        MbrushColor: '#EA1A1A',
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

      clicktab() {
        var navs = document.querySelectorAll('nav a')
        document.querySelector('section').style.display = 'block'
        for (var i = 0; i < navs.length; i++) {
          navs[i].onclick = function () {
            var beforeNav = document.querySelector('.active')
            var beforeId = beforeNav.dataset['cont']
            document.querySelector('#' + beforeId).style.display = 'none'
            for (var j = 0; j < navs.length; j++) {
              navs[j].classList.remove('active')
            }
            this.classList.add('active')
            var secId = this.dataset['cont']
            document.querySelector('#' + secId).style.display = 'block'
          }
        }
      },
      addSection(type, content) {
        /*相关内容添加进对应的Section */

      },

      onChangeBrushColor() {
        const color = document.getElementById('ucolor')
        this.brushColor = color.value
        const num = document.getElementById('urange')
        this.r_brushSize = num.value
        this.onVueStateChange()
      },
      onChangeMBrushColor() {
        const color = document.getElementById('mcolor')
        this.MbrushColor = color.value
        defaultMat.color = new THREE.Color(color.value)
        this.render()
      },
      colorRes() {
        defaultMat.color = new THREE.Color('#CCCCCC')
        this.render()
      },
      autorotate() {
        this.autoRotate = true
        controls.autoRotate = this.autoRotate
      },
      stopautorotate() {
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
      },
      getBrushColor() {
        return (new THREE.Color(this.brushColor)).getHex()
      },
      getBrushSize() {
        return this.r_brushSize / this.multiple
      },
      showPointModel() {
        if (ModelType === false) {
          ModelType = true
          defaultMat.wireframe = true
        } else {
          ModelType = false
          defaultMat.wireframe = false
        }
      },
      lookX1() {
        // 相机查看x
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
        controls.reset()
        var Box = new THREE.Box3().setFromObject(modelMesh)
        camera.position.set(Box.max.x + 100, 0, 0)
        camera.lookAt(new THREE.Vector3())
      },
      lookX2() {
        // 相机查看x
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
        controls.reset()
        var Box = new THREE.Box3().setFromObject(modelMesh)
        camera.position.set(Box.min.x - 100, 0, 0)
        camera.lookAt(new THREE.Vector3())
      },
      lookY1() {
        // 相机查看y
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
        controls.reset()
        var Box = new THREE.Box3().setFromObject(modelMesh)
        camera.position.set(0, Box.max.y + 100, 0)
        camera.lookAt(new THREE.Vector3())
      },
      lookY2() {
        // 相机查看y
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
        controls.reset()
        var Box = new THREE.Box3().setFromObject(modelMesh)
        camera.position.set(0, Box.min.y - 100, 0)
        camera.lookAt(new THREE.Vector3())
      },
      lookZ1() {
        // 相机查看z
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
        controls.reset()
        var Box = new THREE.Box3().setFromObject(modelMesh)
        camera.position.set(0, 0, Box.max.z + 100)
        camera.lookAt(new THREE.Vector3())
      },
      lookZ2() {
        // 相机查看z
        this.autoRotate = false
        controls.autoRotate = this.autoRotate
        controls.reset()
        var Box = new THREE.Box3().setFromObject(modelMesh)
        camera.position.set(0, 0, Box.min.z - 100)
        camera.lookAt(new THREE.Vector3())
      },
      locationRes() {
        // 位置还原
        controls.reset()
      },
      //初始化three.js相关内容
      init() {
        const container = document.getElementById('container')
        mouseOffset.top = container.getBoundingClientRect().top
        mouseOffset.left = container.getBoundingClientRect().left
        defaultMat = new THREE.MeshLambertMaterial({
          color: 0xCCCCCC,
          wireframe: false,
          side: THREE.DoubleSide
        });

        renderer = new THREE.WebGLRenderer()
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(container.clientWidth, container.clientHeight)
        // 开启模型对象的局部剪裁平面功能，如果不设置为true，设置剪裁平面的模型不会被剪裁
        renderer.localClippingEnabled = true

        /*添加标签渲染div */
        // labelRenderer = new CSS2DRenderer()
        // labelRenderer.setSize(container.clientWidth, container.clientHeight)
        // labelRenderer.domElement.style.position = 'absolute'
        // labelRenderer.domElement.style.top = 0
        // container.appendChild(labelRenderer.domElement)
        /*添加标签渲染 */

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

        /*添加外框边线效果 */
				// composer = new EffectComposer( renderer )
				// renderPass = new RenderPass( scene, camera )
				// composer.addPass( renderPass )
				// outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera )
				// composer.addPass( outlinePass )
        /*添加外框边线效果 */

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

      initScene() {
        camera.position.set(0, 0, 100)
        camera.lookAt(0, 0, 0)
        directionalLight.position.x = 1
        directionalLight.position.y = 1
        directionalLight.position.z = 2
        directionalLight.position.normalize()
        pointLight.position.x = 0
        pointLight.position.y = -25
        pointLight.position.z = 10
        if (modelMesh) {
          scene.remove(modelMesh)
        }
        this.clearMarks()
        controls.reset()
      },
      clearMarks() {
        if (markObjects.length > 0) {
          for (var i = 0, l = markObjects.length; i < l; i++) {
            scene.remove(markObjects[i])
          }
          markObjects = []
        }
        // 删除tag标签下的所有元素
        document.getElementById('tag').innerHTML = ''
      },
      animate() {
        requestAnimationFrame(this.animate);
        this.render()
      },
      onVueStateChange() {
        this.setBrush(this.getBrushSize(), this.getBrushColor())
        controls.autoRotate = this.autoRotate
      },

      onDocumentMouseMove(event) {
        if (!isShiftDown || !this.enableMark) {
          return
        }
        event.preventDefault()
        mouse.x = ((event.clientX - mouseOffset.left) / renderer.domElement.clientWidth) * 2 - 1
        mouse.y = -((event.clientY - mouseOffset.top) / renderer.domElement.clientHeight) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        var sceneObjects = markObjects.concat(modelMesh)
        var intersects = raycaster.intersectObjects(sceneObjects)

        // 是否在模型内
        if (intersects.length > 0) {

          /*添加标签 */
          if (AddLabel === true) {
            var intersect = intersects[0]
            brushMesh.position.copy(intersect.point)
            if (mouseDown && mouseRightDown && intersect.object !== modelMesh) {
              // &&areaObjects.indexOf(intersect.object) > -1
              scene.remove(intersect.object)
              // areaObjects.splice(areaObjects.indexOf(intersect.object), 1)
            } else if (mouseDown && !mouseRightDown && intersect.object === modelMesh &&
              prePoint != null &&
              this.pointDistanceThan(prePoint, intersect.point, this.getBrushSize() * 0.2)) {
              this.setPaint(intersect)
            }
            return
          }
          /*添加标签 */

          /*计算距离 */
          if (CalDistance === true) {
            /* 鼠标左键未点击时线段的移动状态 */
            if (scene.getObjectByName('line_move_d')) {
              scene.remove(scene.getObjectByName('line_move_d'))
            }
            /* 创建线段 */
            var lineGeometry = new THREE.Geometry()
            var lineMaterial = new THREE.LineBasicMaterial({
              color: 0xffff00
            })
            if (tmp_pointsArray.length < 2) {
              lineGeometry.vertices.push(tmp_pointsArray[0].geometry.vertices[0])
              var mouseVector3 = new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)
              lineGeometry.vertices.push(mouseVector3)
              var line = new THREE.Line(lineGeometry, lineMaterial)
              line.name = 'line_move_d'
              scene.add(line)
            }
            return
          }
          /*计算距离 */

          /*计算角度 */
          if (CalAngle === true) {
            /* 鼠标左键未点击时线段的移动状态 */
            if (scene.getObjectByName('line_move_a')) {
              scene.remove(scene.getObjectByName('line_move_a'))
            }
            /* 创建线段 */
            var lineGeometry = new THREE.Geometry()
            var lineMaterial = new THREE.LineBasicMaterial({
              color: 0xffff00
            })
            if (a_pointsArray.length < 2) {
              // 求中点
              var line3 = new THREE.Line3()
              line3.start = a_pointsArray[0].geometry.vertices[0]
              line3.end = intersects[0].point
              var center = new THREE.Vector3()
              line3.getCenter(center)
              // 画弧线
              var r = a_pointsArray[0].geometry.vertices[0].distanceTo(new THREE.Vector3(0, 0, 0))
              var ag_center = center.addScalar(r - (center.distanceTo(new THREE.Vector3(0, 0, 0))))
              var geometry_a = new THREE.Geometry()
              var curve = new THREE.QuadraticBezierCurve3(
                a_pointsArray[0].geometry.vertices[0], 
                ag_center, intersects[0].point)
              var points = curve.getPoints(120)
              geometry_a.setFromPoints(points)
              var material_a = new THREE.LineBasicMaterial({
                color: 0xff0000
              })
              var line = new THREE.Line(geometry_a, material_a)
              line.name = 'line_move_a'
              scene.add(line)
            }
            return
          }
          /*计算角度 */

          /*计算表面积 */
          if (CalArea === true && mouseDown) {
            faceName++
            var intersect_a = intersects[0]
            let face = intersect_a.face
            //显示三角面
            var triangle_material = new THREE.MeshStandardMaterial({
              color: 0xffff00,
              side: THREE.DoubleSide
            });
            let faceGeometry = new THREE.Geometry()
            faceGeometry.vertices.push(modelMesh.geometry.vertices[face.a])
            faceGeometry.vertices.push(modelMesh.geometry.vertices[face.b])
            faceGeometry.vertices.push(modelMesh.geometry.vertices[face.c])

            let face3 = new THREE.Face3(0, 1, 2, face.normal, 0x00cc00, 0)
            faceGeometry.faces.push(face3)
            faceGeometry.computeFaceNormals()
            faceGeometry.computeVertexNormals()
            let faceMesh = new THREE.Mesh(faceGeometry, triangle_material)
            faceMesh.name = 'face_' + faceName
            areaObjectsArray.push(faceMesh)
            tmp_areaObjectuuid.faceArray.push(faceMesh.uuid)
            this.setPaint(faceMesh)
            scene.add(faceMesh)
            return
          }
          /*计算表面积 */

          /*模型标注 */
          var intersect = intersects[0]
          brushMesh.position.copy(intersect.point)
          if (mouseDown && mouseRightDown && intersect.object !== modelMesh &&
            markObjects.indexOf(intersect.object) > -1) {
            scene.remove(intersect.object)
            markObjects.splice(markObjects.indexOf(intersect.object), 1)
          } else if (mouseDown && !mouseRightDown && intersect.object === modelMesh &&
            prePoint != null &&
            this.pointDistanceThan(prePoint, intersect.point, this.getBrushSize() * 0.2)) {
            this.setPaint(intersect)
          }
          /*模型标注 */
        }
      },
      onDocumentMouseDown(event) {
        if (event.target.nodeName.toLowerCase() == 'canvas' && controls.autoRotate) {
          controls.autoRotate = false
          this.autoRotate = false
        }
        if (!isShiftDown || !this.enableMark) {
          return
        }
        mouseDown = true
        mouse.x = ((event.clientX - mouseOffset.left) / renderer.domElement.clientWidth) * 2 - 1
        mouse.y = -((event.clientY - mouseOffset.top) / renderer.domElement.clientHeight) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        var sceneObjects = markObjects.concat(modelMesh)
        var intersects = raycaster.intersectObjects(sceneObjects)

        /*添加标签 */
        if (AddLabel === true) {
          if (intersects.length > 0) {
            var intersect = intersects[0]
            if (event.button == 2) {
              mouseRightDown = true
              if (intersect.object !== modelMesh && labelObjects.indexOf(intersect.object) > -1) {
                scene.remove(intersect.object)
                labelObjects.splice(labelObjects.indexOf(intersect.object), 1)
              }
            } else {
              mouseRightDown = false
              if (intersect.object === modelMesh) {
                this.setPaint(intersect)
              }
            }
            return
          }
        }
        /*添加标签 */

        // 是否在模型内
        if (intersects.length > 0) {

          /*计算距离 */
          if (CalDistance === true) {
            if (event.button === 0) {
              pointName++
              tmp_distanceArray.name = 'distance_' + disName
              /* 若交点此时在模型之内则创建点(Points) */
              var pointsGeometry = new THREE.Geometry()
              pointsGeometry.vertices.push(intersects[0].point)
              var pointsMaterial = new THREE.PointsMaterial({
                color: 0xff0000,
                size: 1
              })
              var points = new THREE.Points(pointsGeometry, pointsMaterial)
              points.name = tmp_distanceArray.name + '_point_' + pointName
              tmp_pointsArray.push(points)
              distancePointArray.push(points)
              tmp_distanceArray.pointsArray.push(points.uuid)
              if (tmp_pointsArray.length >= 2) {
                // 删除临时显示的线
                if (scene.getObjectByName('line_move_d')) {
                  scene.remove(scene.getObjectByName('line_move_d'))
                }
                /* 创建线段 */
                var lineGeometry = new THREE.Geometry()
                var lineMaterial = new THREE.LineBasicMaterial({color: 0xffff00})
                lineGeometry.vertices.push(tmp_pointsArray[0].geometry.vertices[0], tmp_pointsArray[1].geometry.vertices[0])
                var line = new THREE.Line(lineGeometry, lineMaterial)
                // 测量距离并显示

                // 求中点
                var line_c = new THREE.Line3()
                line_c.start = tmp_pointsArray[0].geometry.vertices[0]
                line_c.end = tmp_pointsArray[1].geometry.vertices[0]
                var center = new THREE.Vector3()
                line_c.getCenter(center)
                var textOBJ = this.addText(center.x, center.y, center.z,
                  this.toDistance(tmp_pointsArray[0].geometry.vertices[0],
                    tmp_pointsArray[1].geometry.vertices[0]))
                scene.add(textOBJ)
                distanceSpriteArray.push(textOBJ)
                tmp_pointsArray.splice(0, tmp_pointsArray.length)
                // 求中点

                disName++
                textOBJ.name = tmp_distanceArray.name + '_elves_' + disName
                tmp_distanceArray.elvesArray = textOBJ.uuid
                line.name = tmp_distanceArray.name + '_line_' + disName
                tmp_distanceArray.lineArray = line.uuid
                distanceLineArray.push(line)
                scene.add(line)
                // 对象深拷贝
                distanceArray.push(JSON.parse(JSON.stringify(tmp_distanceArray)))

                /*显示进列表中 */
                if(distanceArray.length > 0) {
                  var ui_distance = document.getElementById('distance')
                  var liElement = document.createElement('li')
                  liElement.style.listStyle = 'none'
                  liElement.id = tmp_distanceArray.name + 'li'

                  var buttonViewElement = document.createElement('input')
                  buttonViewElement.type = 'button'
                  buttonViewElement.id = tmp_distanceArray.name + '_v'
                  buttonViewElement.value = tmp_distanceArray.name
                  buttonViewElement.addEventListener('mousedown', this.checkDistance, false)

                  var buttonDelElement = document.createElement('input')
                  buttonDelElement.type = 'button'
                  buttonDelElement.id = tmp_distanceArray.name + '_d'
                  buttonDelElement.value = '删除'
                  buttonDelElement.addEventListener('mousedown', this.deleteDistance, false)

                  liElement.appendChild(buttonViewElement)
                  liElement.appendChild(buttonDelElement)
                  ui_distance.appendChild(liElement)
                  tmp_distanceArray.pointsArray.splice(0,tmp_distanceArray.pointsArray.length)
                }
                /*显示进列表中 */

                pointName = 0
                CalDistance = false
              }
              scene.add(points)
            }

            return
          }
          /*计算距离 */

          /*计算角度 */
          if (CalAngle === true) {
            if (event.button === 0) {
              aPointName++
              tmp_angleArray.name = 'angle_' + angleName
              /* 若交点此时在模型之内则创建点(Points) */
              var pointsGeometry = new THREE.Geometry()
              pointsGeometry.vertices.push(intersects[0].point)
              var pointsMaterial = new THREE.PointsMaterial({
                color: 0xff0000,
                size: 1
              })
              var points = new THREE.Points(pointsGeometry, pointsMaterial)
              points.name = tmp_angleArray.name + '_point_' + aPointName
              a_pointsArray.push(points)
              AnglePointArray.push(points)
              tmp_angleArray.pointsArray.push(points.uuid)
              if (a_pointsArray.length >= 2) {
                // 删除多余弧线
                if (scene.getObjectByName('line_move_a')) {
                  scene.remove(scene.getObjectByName('line_move_a'))
                }
                angleName++
                // 测量角度
                // 求中点
                var line3 = new THREE.Line3()
                line3.start = a_pointsArray[0].geometry.vertices[0]
                line3.end = a_pointsArray[1].geometry.vertices[0]
                var center = new THREE.Vector3()
                line3.getCenter(center)
                // 求角度
                var c = a_pointsArray[0].geometry.vertices[0].angleTo(a_pointsArray[1].geometry.vertices[0])
                // 画弧线
                var r = a_pointsArray[0].geometry.vertices[0].distanceTo(new THREE.Vector3(0, 0, 0))
                var ag_center = center.addScalar(r - (center.distanceTo(new THREE.Vector3(0, 0, 0))))
                var geometry_a = new THREE.Geometry()
                var curve = new THREE.QuadraticBezierCurve3(
                  a_pointsArray[0].geometry.vertices[0],
                  ag_center, a_pointsArray[1].geometry.vertices[0])
                var c_points = curve.getPoints(120)
                geometry_a.setFromPoints(c_points)
                var material_a = new THREE.LineBasicMaterial({
                  color: 0xff0000
                })
                var line_a = new THREE.Line(geometry_a, material_a)
                AngleLineArray.push(line_a)
                line_a.name = tmp_angleArray.name + '_line_' + angleName
                scene.add(line_a)

                // 添加精灵标签
                var center_point = parseInt(c_points.length / 2)
                var testAngle = String(THREE.Math.radToDeg(c).toFixed(1)) + '°'
                var textOBJ = this.addText(c_points[center_point].x, c_points[center_point].y, c_points[center_point].z, testAngle)
                textOBJ.name = tmp_angleArray.name + '_elves_' + angleName
                scene.add(textOBJ)
                AngleSpriteArray.push(textOBJ)

                tmp_angleArray.lineArray = line_a.uuid
                tmp_angleArray.elvesArray = textOBJ.uuid
                // 对象深拷贝
                AngleArray.push(JSON.parse(JSON.stringify(tmp_angleArray)))
                a_pointsArray.splice(0, a_pointsArray.length)

                /*显示进列表 */
                if(AngleArray.length > 0){
                  var ui_angle = document.getElementById('angle')
                  var liElement = document.createElement('li')
                  liElement.style.listStyle = 'none'
                  liElement.id = tmp_angleArray.name + 'li'

                  var buttonViewElement = document.createElement('input')
                  buttonViewElement.type = 'button'
                  buttonViewElement.id = tmp_angleArray.name + '_v'
                  buttonViewElement.value = tmp_angleArray.name
                  buttonViewElement.addEventListener('mousedown', this.checkAngle, false)

                  var buttonDelElement = document.createElement('input')
                  buttonDelElement.type = 'button'
                  buttonDelElement.id = tmp_angleArray.name + '_d'
                  buttonDelElement.value = '删除'
                  buttonDelElement.addEventListener('mousedown', this.deleteAngle, false)

                  liElement.appendChild(buttonViewElement)
                  liElement.appendChild(buttonDelElement)
                  ui_angle.appendChild(liElement)
                  tmp_angleArray.pointsArray.splice(0,tmp_angleArray.pointsArray.length)
                }
                /*显示进列表 */

                aPointName = 0
                CalAngle = false
              }
              scene.add(points)
            }
            return
          }
          /*计算角度 */

          /*计算表面积 */
          if (CalArea === true) {
            return
          }
          /*计算表面积 */

          /*模型标注 */
          var intersect = intersects[0]
          if (event.button == 2) {
            mouseRightDown = true
            if (intersect.object !== modelMesh && markObjects.indexOf(intersect.object) > -1) {
              scene.remove(intersect.object)
              markObjects.splice(markObjects.indexOf(intersect.object), 1)
            }
          } else {
            mouseRightDown = false
            if (intersect.object === modelMesh) {
              this.setPaint(intersect)
            }
          }
          /*模型标注 */
        }
      },
      onDocumentMouseUp(event) {
        /*计算表面积 */
        if (CalArea === true) {
          areaName++
          faceName++
          tmp_areaObjectuuid.name = 'area_' + areaName
          var area = 0.0
          var mid = parseInt(areaObjects.length / 2)
          var midPoint = null
          // 对于不规则曲面，细分程度越高，面积计算精度越高
          for (var i = 0; i < areaObjects.length; i++) {
            if (i === mid) {
              midPoint = areaObjects[i].geometry.vertices[1]
            }
            var p1 = areaObjects[i].geometry.vertices[0]
            var p2 = areaObjects[i].geometry.vertices[1]
            var p3 = areaObjects[i].geometry.vertices[2]
            area += this.AreaOfTriangle(p1, p2, p3)
          }
          var textOBJ = this.addText(midPoint.x, midPoint.y, midPoint.z, area.toFixed(2))
          textOBJ.name = tmp_areaObjectuuid.name + '_elves_' + faceName
          scene.add(textOBJ)
          areaSpriteArray.push(textOBJ)
          tmp_areaObjectuuid.elves = textOBJ.uuid
          // 对象深拷贝
          areaObjectArray.push(JSON.parse(JSON.stringify(tmp_areaObjectuuid)))

          /*显示进列表 */
          if(areaObjectArray.length > 0) {
            var ui_area = document.getElementById('area')
            var liElement = document.createElement('li')
            liElement.style.listStyle = 'none'
            liElement.id = tmp_areaObjectuuid.name + 'li'

            var buttonViewElement = document.createElement('input')
            buttonViewElement.type = 'button'
            buttonViewElement.id = tmp_areaObjectuuid.name + '_v'
            buttonViewElement.value = tmp_areaObjectuuid.name
            buttonViewElement.addEventListener('mousedown', this.checkArea, false)

            var buttonDelElement = document.createElement('input')
            buttonDelElement.type = 'button'
            buttonDelElement.id = tmp_areaObjectuuid.name + '_d'
            buttonDelElement.value = '删除'
            buttonDelElement.addEventListener('mousedown', this.deleteArea, false)

            liElement.appendChild(buttonViewElement)
            liElement.appendChild(buttonDelElement)
            ui_area.appendChild(liElement)
          }
          /*显示进列表 */
          
          // 清空临时数据
          tmp_areaObjectuuid.faceArray.splice(0, tmp_areaObjectuuid.faceArray.length)
          areaObjects.splice(0, areaObjects.length)
          CalArea = false
          mouseDown = false
          mouseRightDown = false
          return
        }
        /*计算表面积 */

        /*添加标签 */
        if (AddLabel === true) {
          labelIDNum++
          // 添加标签-开始画线
          // AddLabelLine = true
          var c = parseInt(tmp_labelObjects.length / 2)
          // var p1 = tmp_labelObjects[c].position.x
          // var p2 = tmp_labelObjects[c].position.y
          // var p3 = tmp_labelObjects[c].position.z
          // this.addText(p1, p2, p3, '测试')

          /*增加输入框 */
          var windowPosition = this.transPosition(tmp_labelObjects[c].position)
          var left = windowPosition.x
          var top = windowPosition.y
          const page1 = document.getElementById('page')
          var inputElement = document.createElement('input')
          inputElement.type = 'text'
          inputElement.id = 'label_' + labelIDNum.toString() + 't'
          inputElement.style.position = 'absolute'
          inputElement.style.left = left + 'px'
          inputElement.style.top = top + 'px'
          inputElement.addEventListener('keydown', this.enterUP, false)
          page1.appendChild(inputElement)
          // 显示模型标签的div添加，用来坐标更新等
          var input = {}
          input.inputElement = inputElement
          input.position = tmp_labelObjects[c].position
          labelTextBox.push(input)
          /*增加输入框 */

          // var inputElement = document.createElement('input')
          // const page1 = document.getElementById('page')
          // inputElement.type = 'text'
          // inputElement.name = 'text_test'
          // page1.appendChild(inputElement)
          // var modelLabel = new CSS2DObject(inputElement)
          // modelLabel.position.set(p1, p2, p3)
          // scene.add(modelLabel)
          // labelObjects[c].add(modelLabel)

          /*显示进列表中 */
          if(tagLabelUUID.length > 0){
            tagLabelName++
            var tmp_tagLabelUUID = {}
            tmp_tagLabelUUID.model = JSON.parse(JSON.stringify(tagLabelUUID))
            tmp_tagLabelUUID.element = inputElement.id
            tmp_tagLabelUUID.name = 'label_' + (tagLabelName).toString()
            labelRecordModelData.push(tmp_tagLabelUUID)
            tagLabelUUID.splice(0, tagLabelUUID.length)
            
            var ui_tag = document.getElementById('label')
            var liElement = document.createElement('li')
            liElement.style.listStyle = 'none'
            liElement.id = tmp_tagLabelUUID.name + 'li'

            var buttonViewElement = document.createElement('input')
            buttonViewElement.type = 'button'
            buttonViewElement.id = tmp_tagLabelUUID.name + '_v'
            buttonViewElement.value = tmp_tagLabelUUID.name
            buttonViewElement.addEventListener('mousedown', this.checkLabel, false)

            var buttonDelElement = document.createElement('input')
            buttonDelElement.type = 'button'
            buttonDelElement.id = tmp_tagLabelUUID.name + '_d'
            buttonDelElement.value = '删除'
            buttonDelElement.addEventListener('mousedown', this.deleteLabel, false)

            liElement.appendChild(buttonViewElement)
            liElement.appendChild(buttonDelElement)
            ui_tag.appendChild(liElement)
          }
          /*显示进列表中 */

          tmp_labelObjects.splice(0, tmp_labelObjects.length)
          AddLabel = false
          mouseDown = false
          mouseRightDown = false
          return
        }
        /*添加标签 */

        /*添加标记内容 */
        if (tagObjects.length > 0) {
          tagName++
          var tmp_tagObjects = {}
          tmp_tagObjects.model = JSON.parse(JSON.stringify(tagObjects))
          tmp_tagObjects.name = 'tag_' + (tagName).toString()
          tagRecordModelData.push(tmp_tagObjects)
          tagObjects.splice(0, tagObjects.length) // 先清除临时标记记录

          // 显示进列表中
          var ui_tag = document.getElementById('tag')
          var liElement = document.createElement('li')
          liElement.style.listStyle = 'none'
          liElement.id = tmp_tagObjects.name + 'li'

          var buttonViewElement = document.createElement('input')
          buttonViewElement.type = 'button'
          buttonViewElement.id = tmp_tagObjects.name + '_v'
          buttonViewElement.value = tmp_tagObjects.name
          buttonViewElement.addEventListener('mousedown', this.checkTag, false)

          var buttonDelElement = document.createElement('input')
          buttonDelElement.type = 'button'
          buttonDelElement.id = tmp_tagObjects.name + '_d'
          buttonDelElement.value = '删除'
          buttonDelElement.addEventListener('mousedown', this.deleteTag, false)

          liElement.appendChild(buttonViewElement)
          liElement.appendChild(buttonDelElement)
          ui_tag.appendChild(liElement)
        }
        /*添加标记内容 */

        mouseDown = false
        mouseRightDown = false
      },
      onDocumentKeyDown(event) {
        switch (event.keyCode) {
          case 16: // shift
          case 17: // ctrl
            isShiftDown = true
            break
        }
      },
      onDocumentKeyUp(event) {
        switch (event.keyCode) {
          case 16: // shift
          case 17: // ctrl
            isShiftDown = false
            break
        }
      },
      setPaint(intersect) {
        /*模型表面积计算 */
        if (CalArea === true) {
          areaObjects.push(intersect)
          return
        }
        /*模型表面积计算 */

        /*添加标签 */
        if (AddLabel === true) {
          var voxel_l = new THREE.Mesh(circleGeo, circleMaterial)
          voxel_l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), intersect.face.normal)
          prePoint = intersect.point
          voxel_l.position.copy(intersect.point)
          voxel_l.name = 'label_' + labelObjects.length
          scene.add(voxel_l)
          labelObjects.push(voxel_l)
          // 记入当前的，用来显示文本坐标
          tmp_labelObjects.push(voxel_l)
          tagLabelUUID.push(voxel_l.uuid)
          return
        }
        /*添加标签 */

        var voxel = new THREE.Mesh(circleGeo, circleMaterial)
        voxel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), intersect.face.normal)
        prePoint = intersect.point
        voxel.position.copy(intersect.point)
        voxel.name = 'mark_' + markObjects.length
        scene.add(voxel)
        markObjects.push(voxel)
        tagObjects.push(voxel.uuid)
      },
      pointDistanceThan(point1, point2, distance) {
        if (Math.abs(point1.x - point2.x) >= distance) {
          return true
        }
        if (Math.abs(point1.y - point2.y) >= distance) {
          return true
        }
        if (Math.abs(point1.z - point2.z) >= distance) {
          return true
        }
        return false
      },

      transPosition(position) {
        /*三维坐标转屏幕坐标 */
        let world_vector = new THREE.Vector3(position.x, position.y, position.z)
        let vector = world_vector.project(camera)
        const container = document.getElementById('container')
        let halfWidth = container.clientWidth / 2,
          halfHeight = container.clientHeight / 2
        return {
          x: Math.round(vector.x * halfWidth + halfWidth),
          y: Math.round(-vector.y * halfHeight + halfHeight)
        }
      },
      addText(x, y, z, text) {
        var textObj = this.makeTextSprite(text, {
          fontsize: 100,
          borderColor: {
            r: 255,
            g: 0,
            b: 0,
            a: 0.4
          },
          /* 边框黑色 */
          backgroundColor: {
            r: 255,
            g: 255,
            b: 255,
            a: 0.9
          } /* 背景颜色 */
        });
        textObj.center = new THREE.Vector2(0, 0)
        textObj.position.set(x, y, z)
        // scene.add(textObj)
        return textObj
      },
      /* 创建字体精灵 */
      makeTextSprite(message, parameters) {
        if (parameters === undefined) parameters = {}
        var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial"
        /* 字体大小 */
        var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18
        /* 边框厚度 */
        var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 5
        /* 边框颜色 */
        var borderColor = parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : {
          r: 0,
          g: 0,
          b: 0,
          a: 1.0
        }
        /* 背景颜色 */
        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : {
          r: 255,
          g: 255,
          b: 255,
          a: 1.0
        }
        /* 创建画布 */
        var canvas = document.createElement('canvas')
        var context = canvas.getContext('2d')
        /* 字体加粗 */
        context.font = "Bold " + fontsize + "px " + fontface
        /* 获取文字的大小数据，高度取决于文字的大小 */
        var metrics = context.measureText(message)
        var textWidth = metrics.width
        /* 背景颜色 */
        context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," +
          backgroundColor.a + ")"
        /* 边框的颜色 */
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor
          .a + ")"
        context.lineWidth = borderThickness
        /* 绘制圆角矩形 */
        this.roundRect(context, borderThickness / 2, borderThickness / 2, textWidth + borderThickness, fontsize * 1.4 +
          borderThickness, 6)
        /* 字体颜色 */
        context.fillStyle = "rgba(0, 0, 0, 1.0)"
        context.fillText(message, borderThickness, fontsize + borderThickness)
        /* 画布内容用于纹理贴图 */
        var texture = new THREE.Texture(canvas)
        texture.needsUpdate = true
        var spriteMaterial = new THREE.SpriteMaterial({
          map: texture
        })
        var sprite = new THREE.Sprite(spriteMaterial)
        /* 缩放比例 */
        sprite.scale.set(10, 5, 0)
        return sprite
      },
      /* 绘制圆角矩形 */
      roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      },

      // 窗口监听函数
      onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      },
      animate() {
        /*更新添加的div屏幕坐标 */
        requestAnimationFrame(this.animate)
        this.render()
      },
      render() {
        controls.enabled = !isShiftDown
        controls.update()
        if (brushMesh) {
          brushMesh.visible = isShiftDown && this.enableMark
        }
        // 标签渲染
        // labelRenderer.render(scene, camera)
        this.divRender(labelTextBox)

        // 高光渲染
        if(composer !== ''){
          composer.render()
        }

        renderer.render(scene, camera)
      },
      setBrush(_brushSize, _brushColor) {
        circleGeo = new THREE.CylinderBufferGeometry(_brushSize, _brushSize, _brushSize / 5, 16)
        circleMaterial = new THREE.MeshBasicMaterial({
          color: _brushColor
        })
        var brushMaterial = new THREE.MeshBasicMaterial({
          color: _brushColor,
          opacity: 0.5,
          transparent: true,
          wireframe: true
        })
        this.sceneRemoveByName('brushMesh')
        var brushMeshGeo = new THREE.SphereBufferGeometry(_brushSize, 16, 16)
        brushMesh = new THREE.Mesh(brushMeshGeo, brushMaterial)
        brushMesh.name = 'brushMesh'
        scene.add(brushMesh)
      },
      sceneRemoveByName(name) {
        if (scene.children) {
          for (var i = 0, l = scene.children.length; i < l; i++) {
            var child = scene.children[i]
            if (child.name === name) {
              scene.remove(child)
              return
            }
          }
        }
      },
      setBrushSize(size) {
        this.r_brushSize = size
        this.brushSizeMin = 2
        this.brushSizeMax = this.r_brushSize * 6
        this.brushSizeStep = 2
      },
      initGui() {
        this.multiple = 1
        this.autoRotate = true
        var tmp = this.r_brushSize
        while (tmp < 100) {
          this.multiple = this.multiple * 10
          tmp = brushSize * this.multiple
        }

        this.setBrushSize(Math.ceil(brushSize * this.multiple))
        controls.autoRotate = this.autoRotate
      },
      getMergedGeometry(result) {
        if (result.isGeometry) {
          return result
        } else if (result.isBufferGeometry) {
          var op_result = new THREE.Geometry().fromBufferGeometry( result )
          // 模型平衡优化
          op_result.mergeVertices()
          return op_result
        } else if (result.geometry && result.geometry.isGeometry) {
          return result.geometry
        } else if (result.geometry && result.geometry.isBufferGeometry) {
          return (new THREE.Geometry().fromBufferGeometry(result))
        } else if ((result.isObject3D || result.isGroup || result.isScene) && result.children) {
          if (result.children.length == 1 && result.children[0] instanceof THREE.Mesh) {
            result.children[0].geometry.faceVertexUvs = [
              []
            ]
            return (new THREE.Geometry().fromBufferGeometry(result.children[0].geometry))
          } else if (result.children.length > 1) {
            var geometry = new THREE.Geometry()
            result.children.forEach(function (child) {
              if (child instanceof THREE.Mesh) {
                var mesh = child
                mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry)
                mesh.geometry.faceVertexUvs = [
                  []
                ]
                mesh.updateMatrix()
                geometry.merge(mesh.geometry, mesh.matrix)
              }
            });
            return geometry
          }
        } else if (result.scenes && result.scenes.length > 0) {
          var geometry = new THREE.Geometry()
          result.scenes.forEach(function (scene) {
            if (scene.children) {
              scene.children.forEach(function (child) {
                if (child.name && child.name.indexOf('mark_') == 0) {
                  marksFromModel.push(child)
                  return;
                }
                if (child instanceof THREE.Mesh) {
                  var mesh = child
                  mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry)
                  mesh.geometry.faceVertexUvs = [
                    []
                  ]
                  mesh.updateMatrix()
                  geometry.merge(mesh.geometry, mesh.matrix)
                } else if (child.children) {
                  child.children.forEach(function (ch) {
                    if (ch instanceof THREE.Mesh) {
                      var mesh = ch
                      mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry)
                      mesh.geometry.faceVertexUvs = [
                        []
                      ]
                      mesh.updateMatrix()
                      geometry.merge(mesh.geometry, mesh.matrix)
                    }
                  });
                }
              });
            }
          });
          return geometry
        } else if (result instanceof Array && result[0] instanceof THREE.Mesh) {
          var geometry = new THREE.Geometry()
          result.forEach(function (child) {
            var mesh = child
            if (mesh.geometry.index && mesh.geometry.index.array) {
              mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
            }
            mesh.geometry.faceVertexUvs = [
              []
            ]
            mesh.updateMatrix()
            geometry.merge(mesh.geometry, mesh.matrix)
          });
          return geometry
        }
        return false
      },
      onModelLoaded(result) {
        var geo = this.getMergedGeometry(result)
        if (!geo) {
          return
        }
        this.addObjectToScene(geo)
      },
      addObjectToScene(geometry) {
        this.initScene()
        if (!geometry.isGeometry) {
          return
        }
        geometry.computeBoundingBox()
        geometry.computeFaceNormals()
        geometry.computeVertexNormals()
        geometry.center()
        modelMesh = new THREE.Mesh(geometry, defaultMat)
        modelMesh.name = 'modelMesh'
        scene.add(modelMesh)
        if (marksFromModel.length > 0) {
          for (var i = 0, l = marksFromModel.length; i < l; i++) {
            scene.add(marksFromModel[i])
          }
          marksFromModel = []
        }

        directionalLight.position.x = geometry.boundingBox.min.y * 2
        directionalLight.position.y = geometry.boundingBox.min.y * 2
        directionalLight.position.z = geometry.boundingBox.max.z * 2
        pointLight.position.x = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2
        pointLight.position.y = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2
        pointLight.position.z = geometry.boundingBox.max.z * 2
        camera.position.set(0, 0, Math.max(geometry.boundingBox.max.x * 3, geometry.boundingBox.max.y * 3, geometry
          .boundingBox.max.z * 3))
        var maxDim = Math.max(geometry.boundingBox.max.x - geometry.boundingBox.min.x, geometry.boundingBox.max.y -
          geometry.boundingBox.min.y, geometry.boundingBox.max.z - geometry.boundingBox.min.z)
        if (maxDim == 0) {
          alertBox('Model demention error!')
          return
        }
        brushSize = maxDim / 200
        this.initGui()
        this.setBrush(this.getBrushSize(), this.getBrushColor())
        isLoadedModel = true
        if (this.onModelshow && typeof (this.onModelshow) == 'function') {
          this.onModelshow()
        }
        controls.initPosition()
      },
      onLoadModelError(errObj) {
        console.error(errObj)
      },
      //外部模型加载函数
      loadModel(filepath, type) {
        //包含材质
        var loader = null
        if (type === 'stl') {
          loader = new STLLoader()
        }
        if (type === 'obj') {
          loader = new OBJLoader()
        }
        loader.load(filepath, this.onModelLoaded, this.onLoadModelError)
      },

      setMarkObjectsShow(isShow) {
        for (var i = 0, l = markObjects.length; i < l; i++) {
          markObjects[i].visible = isShow
        }
      },
      getCanvasImg(sidelen, type) {
        if (!sidelen) {
          return
        }
        type = type || 'all'
        scene.background = new THREE.Color(0xffffff)
        if (type == 'model') {
          this.setMarkObjectsShow(false)
        }
        var renderer2 = new THREE.WebGLRenderer({
          preserveDrawingBuffer: true,
          antialias: true
        })
        renderer2.setPixelRatio(window.devicePixelRatio)
        renderer2.setSize(container.clientWidth / 3, container.clientHeight / 3)
        renderer2.render(scene, camera)

        var canvas = renderer2.domElement
        var w = canvas.width,
          h = canvas.height
        var retCanvas = document.createElement('canvas')
        retCanvas.width = sidelen
        retCanvas.height = sidelen
        var retCtx = retCanvas.getContext('2d')
        retCtx.fillStyle = '#ffffff'
        retCtx.fillRect(0, 0, retCanvas.width, retCanvas.height)
        if (w > h) {
          var sx = (w - h) / 2
          var sy = 0
          var sw = h
          var sh = h
        } else {
          var sx = 0
          var sy = (h - w) / 2
          var sw = w
          var sh = w
        }
        retCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sidelen, sidelen);
        var str = retCanvas.toDataURL('image/png');
        scene.background = new THREE.Color(sceneBgColor);
        if (type == 'model') {
          this.setMarkObjectsShow(true);
        }
        return str
      },
      saveimage() {
        const image = this.getCanvasImg(240, 'mark')
        this.snapshot = image
      },

      getMarksSTL(callback) {
        if (!markObjects.length) {
          callback(false)
          return
        }
        var output = new THREE.Mesh(this.getMergedGeometry(markObjects), defaultMat)
        var result = new STLExporter().parse(output, {
          binary: true
        })
        callback(result);
      },
      exportMarks() {
        this.getMarksSTL((outputStr) => {
          if (!outputStr) {
            return
          }
          var blob = new Blob([outputStr], {
            type: 'application/octet-stream'
          })
          var downlink = document.getElementById('downlink')
          downlink.href = URL.createObjectURL(blob)
          downlink.download = 'exportMark.stl'
          downlink.click()
        })
      },
      exportSTL() {
        const result = new STLExporter().parse(modelMesh, {
          binary: true
        })
        var blob = new Blob([result], {
          type: 'application/octet-stream'
        })
        var downlink = document.getElementById('downlink')
        downlink.href = URL.createObjectURL(blob)
        downlink.download = 'exportSTL.stl'
        downlink.click()
      },

      delMark() {
        if (!markObjects.length) {
          return
        }
        this.clearMarks()
      },

      importMODEL() {

        /*初始化 */
        labelIDNum = 0
        tagName = 0
        /*初始化 */

        const fileName = document.getElementById('fileSTL')
        const fileType = fileName.value.substr(fileName.value.lastIndexOf('.') + 1)
        if (fileType !== 'stl' && fileType !== 'obj') {
          alert('不支持此类型')
          return
        }
        this.loadModel('../static/' + fileName.value.split('\\')[fileName.value.split('\\').length - 1], fileType)
        // this.loadModel(fileName.value, fileType)
      },

      seleteVal() {
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
        if (this.select2 === 'x轴这边') {
          this.r_section = parseInt(Box.max.x)
          this.sectionSizeMin = parseInt(Box.min.x)
          this.sectionSizeMax = parseInt(Box.max.x)
          PlaneArr = [
            //创建一个垂直x轴的平面
            new THREE.Plane(new THREE.Vector3(1, 0, 0), parseInt(Box.max.x)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.y)) + Math.abs(parseInt(Box.min.y))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if (this.select2 === 'x轴那边') {
          this.r_section = parseInt(Box.max.x)
          this.sectionSizeMin = parseInt(Box.min.x)
          this.sectionSizeMax = parseInt(Box.max.x)
          PlaneArr = [
            //创建一个垂直x轴的平面
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), parseInt(Box.max.x)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.y)) + Math.abs(parseInt(Box.min.y))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if (this.select2 === 'y轴这边') {
          this.r_section = parseInt(Box.max.y)
          this.sectionSizeMin = parseInt(Box.min.y)
          this.sectionSizeMax = parseInt(Box.max.y)
          PlaneArr = [
            //创建一个垂直y轴的平面
            new THREE.Plane(new THREE.Vector3(0, 1, 0), parseInt(Box.max.y)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if (this.select2 === 'y轴那边') {
          this.r_section = parseInt(Box.max.y)
          this.sectionSizeMin = parseInt(Box.min.y)
          this.sectionSizeMax = parseInt(Box.max.y)
          PlaneArr = [
            //创建一个垂直y轴的平面
            new THREE.Plane(new THREE.Vector3(0, -1, 0), parseInt(Box.max.y)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if (this.select2 === 'z轴这边') {
          this.r_section = parseInt(Box.max.z)
          this.sectionSizeMin = parseInt(Box.min.z)
          this.sectionSizeMax = parseInt(Box.max.z)
          PlaneArr = [
            //创建一个垂直z轴的平面
            new THREE.Plane(new THREE.Vector3(0, 0, 1), parseInt(Box.max.z)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
        if (this.select2 === 'z轴那边') {
          this.r_section = parseInt(Box.max.z)
          this.sectionSizeMin = parseInt(Box.min.z)
          this.sectionSizeMax = parseInt(Box.max.z)
          PlaneArr = [
            //创建一个垂直z轴的平面
            new THREE.Plane(new THREE.Vector3(0, 0, -1), parseInt(Box.max.z)),
          ]
          renderer.clippingPlanes = PlaneArr
          // 通过PlaneHelper辅助可视化显示剪裁平面Plane
          // var helper_area = Math.abs(parseInt(Box.max.x)) + Math.abs(parseInt(Box.max.z))
          // this.setHelper(PlaneArr[0], helper_area)
        }
      },
      setHelper(planeArr, helperArea) {
        var x = scene.getObjectByName('helper')
        if (x !== undefined) {
          scene.remove(x)
        }
        var helper = new THREE.PlaneHelper(planeArr, helperArea, 0xffff00)
        scene.add(helper)
      },
      onChangeSection() {
        const section = document.getElementById('srange')
        PlaneArr[0].constant = section.value
      },

      distance() {
        // 模型空间距离测量
        // var material = new THREE.LineBasicMaterial({color: 0xffff00})
        // var geometry = new THREE.Geometry()
        // var p1 = new THREE.Vector3(-10, 0, 10)
        // var p2 = new THREE.Vector3(0, 10, 10)
        // geometry.vertices.push(p1)
        // geometry.vertices.push(p2)
        // var line = new THREE.Line(geometry, material)
        // scene.add(line)
        // this.addText(-10,0,10,this.toDistance(p1, p2))
        CalDistance = true
      },
      noDistance() {
        // 删除当前line
        if (scene.getObjectByName('line_move')) {
          scene.remove(scene.getObjectByName('line_move'))
        }
        tmp_pointsArray.splice(0, tmp_pointsArray.length)
        CalDistance = false
      },
      getIntersects(event) {
        mouse.x = ((event.clientX - mouseOffset.left) / renderer.domElement.clientWidth) * 2 - 1
        mouse.y = -((event.clientY - mouseOffset.top) / renderer.domElement.clientHeight) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        var sceneObjects = markObjects.concat(modelMesh)
        var intersects = raycaster.intersectObjects(sceneObjects)
        return intersects
      },
      toDistance(p1, p2) {
        var distance = p1.distanceTo(p2)
        return distance.toFixed(2)
      },

      angle() {
        // // 角度
        // var material = new THREE.LineBasicMaterial({color: 0xffff00})
        // var p1 = new THREE.Vector3(-10, 0, 10)
        // var p2 = new THREE.Vector3(0, 10, 10)

        // var lineCenter = new THREE.Line3()
        // lineCenter.start = p1
        // lineCenter.end = p2
        // var center = new THREE.Vector3()
        // lineCenter.getCenter(center)

        // var geometry1 = new THREE.Geometry()
        // geometry1.vertices.push(new THREE.Vector3(0,0,0))
        // geometry1.vertices.push(p1)
        // var line1 = new THREE.Line(geometry1, material)
        // scene.add(line1)

        // var geometry2 = new THREE.Geometry()
        // geometry2.vertices.push(new THREE.Vector3(0,0,0))
        // geometry2.vertices.push(p2)
        // var line2 = new THREE.Line(geometry2, material)
        // scene.add(line2)

        // var c = p1.angleTo(p2)
        // this.addText(center.x,center.y,center.z,THREE.Math.radToDeg(c))

        // var r = p1.distanceTo(new THREE.Vector3(0, 0, 0))
        // var ag_center = center.addScalar(r-(center.distanceTo(new THREE.Vector3(0, 0, 0))))
        // var geometry_a = new THREE.Geometry()
        // var curve = new THREE.QuadraticBezierCurve3(p1, ag_center, p2)
        // var points = curve.getPoints(120)
        // geometry_a.setFromPoints(points)
        // var material_a = new THREE.LineBasicMaterial({color: 0xff0000})
        // var line_a = new THREE.Line(geometry_a, material_a)
        // scene.add(line_a)

        CalAngle = true
      },
      noAngle() {
        if (scene.getObjectByName('line_move')) {
          scene.remove(scene.getObjectByName('line_move'))
        }
        a_pointsArray.splice(0, a_pointsArray.length)
        CalAngle = false
      },

      surfaceArea() {
        // // 测量表面积
        // var area = 0.0
        // // 对于不规则曲面，细分程度越高，面积计算精度越高
        // for (var i = 0; i < modelMesh.faces.length; i++) {
        //   var a = modelMesh.faces[i].a
        //   var b = modelMesh.faces[i].b
        //   var c = modelMesh.faces[i].c
        //   var p1 = modelMesh.vertices[a]
        //   var p2 = modelMesh.vertices[b]
        //   var p3 = modelMesh.vertices[c]
        //   area += AreaOfTriangle(p1, p2, p3)
        // }
        // this.addText(0, 0, 10, area)

        CalArea = true
      },
      noSurfaceArea() {
        // areaObjects.splice(0, areaObjects.length)
        CalArea = false
      },
      AreaOfTriangle(p1, p2, p3) {
        var v1 = new THREE.Vector3()
        var v2 = new THREE.Vector3()
        // 通过两个顶点坐标计算其中两条边构成的向量
        v1 = p1.clone().sub(p2)
        v2 = p1.clone().sub(p3)
        var v3 = new THREE.Vector3()
        // 三角形面积计算
        v3.crossVectors(v1, v2)
        var s = v3.length() / 2
        return s
      },

      addLabel() {
        AddLabel = true
      },
      noAddLabel() {
        AddLabel = false
        AddLabelLine = false
      },
      enterUP(event) {
        if (event.keyCode == 13) {
          const text = document.getElementById(event.path[0].id)
          text.disabled = 'disabled'
        }
      },
      divRender(label) {
        // 计算三维坐标对应的屏幕坐标
        if (label.length > 0) {
          for (var i = 0; i < label.length; i++) {
            //计算三维坐标对应的屏幕坐标
            var windowPosition = this.transPosition(label[i].position)
            var left = windowPosition.x
            var top = windowPosition.y
            // 设置div屏幕位置
            let div = document.getElementById(label[i].inputElement.id)
            if (div !== null) {
              div.style.left = left + 'px'
              div.style.top = top + 'px'
            }
          }
        }
      },

      // outlineObj(selectedObjects){
      //   /*模型边缘高亮显示 */
      //   composer = new EffectComposer( renderer ) // 特效组件
      //   // renderPass = new RenderPass( scene, camera )
      //   // composer.addPass( renderPass ) // 特效渲染
      //   outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera )
      //   composer.addPass( outlinePass ) // 加入高光特效
      //   // outlinePass.pulsePeriod = 2 //数值越大，律动越慢
      //   outlinePass.visibleEdgeColor.set( 0xFFFF99 ) // 高光颜色
      //   outlinePass.hiddenEdgeColor.set( 0x000000 )// 阴影颜色
      //   outlinePass.usePatternTexture = false // 使用纹理覆盖
      //   outlinePass.edgeStrength = 5 // 高光边缘强度
      //   outlinePass.edgeGlow = 1 // 边缘微光强度
      //   outlinePass.edgeThickness = 1 // 高光厚度
      //   outlinePass.selectedObjects = selectedObjects // 需要高光的obj
      // },
      // unrealObj(selectedObjects){
      //   /*添加模型眩光 */
      //   var renderScene = new RenderPass( scene, camera )
      //   //Bloom通道创建
      //   var bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
      //   bloomPass.renderToScreen = true
      //   bloomPass.threshold = 0
      //   bloomPass.strength = 1.5
      //   bloomPass.radius = 0
      //   composer = new EffectComposer( renderer )
      //   composer.setSize( window.innerWidth, window.innerHeight )
      //   composer.addPass( renderScene )
      //   // 眩光通道bloomPass插入到composer
      //   composer.addPass( bloomPass )
      // },
      checkTag(event){
        /*查看单个标记 */
        var buttonID = event.target.id.replace('_v', '')

        for (var y = 0, l = tagRecordModelData.length; y < l; y++) {
          // 查看的是哪个模型
          if(tagRecordModelData[y].name === buttonID){
            // 查看场景中的模型
            for(var j = 0, l = tagRecordModelData[y].model.length; j < l; j++){
              var pos = this.findModel(markObjects, tagRecordModelData[y].model[j])
              if(pos !== -1){
                // 隐藏
                if(markObjects[pos].visible === true){
                  markObjects[pos].visible = false
                }
                // 显示
                else{
                  markObjects[pos].visible = true
                }
              }
            }
          }
        }
      },
      deleteTag(event){
        /*查看单个标记 */
        var buttonID = event.target.id.replace('_d', '')
        for (var y = 0, l = tagRecordModelData.length; y < l; y++) {
          // 删除的是哪个模型
          if(tagRecordModelData[y].name === buttonID){
            
            // 删除场景中的模型
            for(var j = 0, l = tagRecordModelData[y].model.length; j < l; j++){
              var pos = this.findModel(markObjects, tagRecordModelData[y].model[j])
              if(pos !== -1){
                scene.remove(markObjects[pos])
                markObjects.splice(pos, 1)
              }
            }
            
            // 删除相应的列表显示
            tagRecordModelData.splice(y, 1)
            var parent = document.getElementById('tag')
            var son = document.getElementById(buttonID+'li')
            parent.removeChild(son)
          }
        }
      },

      checkLabel(event){
        // 查看选定标签
        var buttonID = event.target.id.replace('_v', '')
        for (var y = 0, l = labelRecordModelData.length; y < l; y++){
          if(labelRecordModelData[y].name === buttonID){
            // 先删除场景中的标记
            for(var j = 0, l = labelRecordModelData[y].model.length; j < l; j++){
              var pos = this.findModel(labelObjects, labelRecordModelData[y].model[j])
              if(pos !== -1){
                // 隐藏
                if(labelObjects[pos].visible === true){
                  labelObjects[pos].visible = false
                  var label_element = document.getElementById(labelRecordModelData[y].name + 't')
                  label_element.style.display = 'none'
                }
                // 显示
                else{
                  labelObjects[pos].visible = true
                  var label_element = document.getElementById(labelRecordModelData[y].name + 't')
                  label_element.style.display = 'inline'
                }
              }
            }
          }
        }
      },
      deleteLabel(event){
        // 删除选定标签
        var buttonID = event.target.id.replace('_d', '')
        for (var y = 0, l = labelRecordModelData.length; y < l; y++){
          if(labelRecordModelData[y].name === buttonID){
            // 先删除场景中的标记
            for(var j = 0, l = labelRecordModelData[y].model.length; j < l; j++){
              var pos = this.findModel(labelObjects, labelRecordModelData[y].model[j])
              if(pos !== -1){
                scene.remove(labelObjects[pos])
                labelObjects.splice(pos, 1)
              }
            }
            // 删除场景中的text
            var parent_page = document.getElementById('page')
            var son_text = document.getElementById(labelRecordModelData[y].name + 't')
            parent_page.removeChild(son_text)

            // 删除相应的列表显示
            var parent_label = document.getElementById('label')
            var son_li = document.getElementById(buttonID+'li')
            parent_label.removeChild(son_li)
          }
        }
      },
      delAllLabel(){
        // 删除所有标签
        if (!labelObjects.length) {
          return
        }
        // 先删除场景里的标记
        if (labelObjects.length > 0) {
          for (var i = 0, l = labelObjects.length; i < l; i++) {
            scene.remove(labelObjects[i])
          }
          labelObjects = []
        }
        // 在删除添加的text
        if (labelTextBox.length > 0) {
          for (var i = 0, l = labelTextBox.length; i < l; i++) {
            var l_id = labelTextBox[i].inputElement.id
            var parent = document.getElementById('page')
            var son = document.getElementById(l_id)
            parent.removeChild(son)
          }
          labelTextBox = []
        }
        for (var y = 0, l = labelRecordModelData.length; y < l; y++){
          // 删除相应的列表显示
          var parent_label = document.getElementById('label')
          var son_li = document.getElementById(labelRecordModelData[y].name+'li')
          parent_label.removeChild(son_li)
        }
        labelIDNum = 0
        tagLabelName = 0
      },
      
      checkDistance() {
        // 查看选定测试距离
        var buttonID = event.target.id.replace('_v', '')
        for (var i = 0, l = distanceArray.length; i < l; i++) {
          if(distanceArray[i].name === buttonID){
            // 隐藏显示点
            if (distanceArray[i].pointsArray.length > 0) {
              for (var j = 0, l = distanceArray[i].pointsArray.length; j < l; j++) {
                var pID = this.findModel(distancePointArray, distanceArray[i].pointsArray[j])
                var u_point = scene.getObjectByName(distancePointArray[pID].name)
                if(u_point.visible === true){
                  u_point.visible = false
                } else {
                  u_point.visible = true
                }
              }
            }
            // 隐藏显示线段
            var lID = this.findModel(distanceLineArray, distanceArray[i].lineArray)
            var u_line = scene.getObjectByName(distanceLineArray[lID].name)
            if(u_line.visible === true){
              u_line.visible = false
            } else {
              u_line.visible = true
            }
            // 隐藏显示精灵文字
            var eID = this.findModel(distanceSpriteArray, distanceArray[i].elvesArray)
            var u_sp = scene.getObjectByName(distanceSpriteArray[eID].name)
            if(u_sp.visible === true){
              u_sp.visible = false
            } else {
              u_sp.visible = true
            }
          }
        }
      },
      deleteDistance() {
        // 删除选定测试距离
        var buttonID = event.target.id.replace('_d', '')
        for (var i = 0, l = distanceArray.length; i < l; i++) {
          if(distanceArray[i].name === buttonID){
            // 删除对应的list
            var parent_dis = document.getElementById('distance')
            var son_li = document.getElementById(buttonID+'li')
            parent_dis.removeChild(son_li)
            // 删除点
            if (distanceArray[i].pointsArray.length > 0) {
              for (var j = 0, l = distanceArray[i].pointsArray.length; j < l; j++) {
                var pID = this.findModel(distancePointArray, distanceArray[i].pointsArray[j])
                scene.remove(scene.getObjectByName(distancePointArray[pID].name))
              }
            }
            // 删除线段
            var lID = this.findModel(distanceLineArray, distanceArray[i].lineArray)
            scene.remove(scene.getObjectByName(distanceLineArray[lID].name))
            // 删除精灵文字
            var eID = this.findModel(distanceSpriteArray, distanceArray[i].elvesArray)
            scene.remove(scene.getObjectByName(distanceSpriteArray[eID].name))
          }
        }
      },
      delAllDistance() {
        for (var i = 0, l = distanceArray.length; i < l; i++) {
          // 删除列表显示
          var parent_dis = document.getElementById('distance')
          var son_li = document.getElementById(distanceArray[i].name+'li')
          parent_dis.removeChild(son_li)
          // 删除点
          if (distanceArray[i].pointsArray.length > 0) {
            for (var j = 0, l = distanceArray[i].pointsArray.length; j < l; j++) {
              var pID = this.findModel(distancePointArray, distanceArray[i].pointsArray[j])
              scene.remove(scene.getObjectByName(distancePointArray[pID].name))
            }
          }
          // 删除线段
          var lID = this.findModel(distanceLineArray, distanceArray[i].lineArray)
          scene.remove(scene.getObjectByName(distanceLineArray[lID].name))
          // 删除精灵文字
          var eID = this.findModel(distanceSpriteArray, distanceArray[i].elvesArray)
          scene.remove(scene.getObjectByName(distanceSpriteArray[eID].name))
        }
        // 清空
        distanceArray.splice(0, distanceArray.length)
        distancePointArray.splice(0, distancePointArray.length)
        distanceLineArray.splice(0, distanceLineArray.length)
        distanceSpriteArray.splice(0, distanceSpriteArray.length)

        pointName = 0
        disName = 0
      },
      
      checkAngle() {
        // 查看选定测试角度
        var buttonID = event.target.id.replace('_v', '')
        for (var i = 0, l = AngleArray.length; i < l; i++) {
          if(AngleArray[i].name === buttonID){
            // 隐藏显示点
            if (AngleArray[i].pointsArray.length > 0) {
              for (var j = 0, l = AngleArray[i].pointsArray.length; j < l; j++) {
                var pID = this.findModel(AnglePointArray, AngleArray[i].pointsArray[j])
                var u_point = scene.getObjectByName(AnglePointArray[pID].name)
                if(u_point.visible === true){
                  u_point.visible = false
                } else {
                  u_point.visible = true
                }
              }
            }
            // 隐藏显示线段
            var lID = this.findModel(AngleLineArray, AngleArray[i].lineArray)
            var u_line = scene.getObjectByName(AngleLineArray[lID].name)
            if(u_line.visible === true){
              u_line.visible = false
            } else {
              u_line.visible = true
            }
            // 隐藏显示精灵文字
            var eID = this.findModel(AngleSpriteArray, AngleArray[i].elvesArray)
            var u_sp = scene.getObjectByName(AngleSpriteArray[eID].name)
            if(u_sp.visible === true){
              u_sp.visible = false
            } else {
              u_sp.visible = true
            }
          }
        }
      },
      deleteAngle() {
        // 删除选定测试角度
        var buttonID = event.target.id.replace('_d', '')
        for (var i = 0, l = AngleArray.length; i < l; i++) {
          if(AngleArray[i].name === buttonID){
            // 删除对应的list
            var parent_dis = document.getElementById('angle')
            var son_li = document.getElementById(buttonID+'li')
            parent_dis.removeChild(son_li)
            // 删除点
            if (AngleArray[i].pointsArray.length > 0) {
              for (var j = 0, l = AngleArray[i].pointsArray.length; j < l; j++) {
                var pID = this.findModel(AnglePointArray, AngleArray[i].pointsArray[j])
                scene.remove(scene.getObjectByName(AnglePointArray[pID].name))
              }
            }
            // 删除线段
            var lID = this.findModel(AngleLineArray, AngleArray[i].lineArray)
            scene.remove(scene.getObjectByName(AngleLineArray[lID].name))
            // 删除精灵文字
            var eID = this.findModel(AngleSpriteArray, AngleArray[i].elvesArray)
            scene.remove(scene.getObjectByName(AngleSpriteArray[eID].name))
          }
        }
      },
      delAllAngle() {
        // 删除所有测试角度
        for (var i = 0, l = AngleArray.length; i < l; i++) {
          // 删除列表显示
          var parent_dis = document.getElementById('angle')
          var son_li = document.getElementById(AngleArray[i].name+'li')
          parent_dis.removeChild(son_li)
          // 删除点
          if (AngleArray[i].pointsArray.length > 0) {
            for (var j = 0, l = AngleArray[i].pointsArray.length; j < l; j++) {
              var pID = this.findModel(AnglePointArray, AngleArray[i].pointsArray[j])
              scene.remove(scene.getObjectByName(AnglePointArray[pID].name))
            }
          }
          // 删除线段
          var lID = this.findModel(AngleLineArray, AngleArray[i].lineArray)
          scene.remove(scene.getObjectByName(AngleLineArray[lID].name))
          // 删除精灵文字
          var eID = this.findModel(AngleSpriteArray, AngleArray[i].elvesArray)
          scene.remove(scene.getObjectByName(AngleSpriteArray[eID].name))
        }
        // 清空
        AngleArray.splice(0, distanceArray.length)
        AnglePointArray.splice(0, distancePointArray.length)
        AngleLineArray.splice(0, distanceLineArray.length)
        AngleSpriteArray.splice(0, distanceSpriteArray.length)
        aPointName = 0
        angleName = 0
      },

      checkArea(){

      },
      deleteArea(){

      },
      delAllArea(){
        // 删除所有测试表面积
        for (var i = 0, l = areaObjectArray.length; i < l; i++){
          // 删除列表显示
          var parent_area = document.getElementById('area')
          var son_li = document.getElementById(areaObjectArray[i].name+'li')
          parent_area.removeChild(son_li)
          // 删除三角片
          if (areaObjectArray[i].faceArray.length > 0) {
            for (var j = 0, l = areaObjectArray[i].faceArray.length; j < l; j++) {
              var aID = this.findModel(areaObjectsArray, areaObjectArray[i].faceArray[j])
              scene.remove(scene.getObjectByName(areaObjectsArray[aID].name))
            }
          }
          // 删除精灵文字
          var eID = this.findModel(areaSpriteArray, areaObjectArray[i].elves)
          scene.remove(scene.getObjectByName(areaSpriteArray[eID].name))
        }

        // 清空
        areaObjectsArray.splice(0, areaObjectsArray.length)
        areaSpriteArray.splice(0, areaSpriteArray.length)
        areaObjectArray.splice(0, areaObjectArray.length)
        areaName = 0
        faceName = 0
      },

      findModel(model, id) {
        /*查找模型uuid，并返回下标 */
        if (model.length > 0) {
          for (var i = 0, l = model.length; i < l; i++) {
            if(model[i].uuid === id) {
              return i
            }
          }
          return -1
        }
        return -1
      }
        

    },
    mounted() {
      this.init()
    }
  }
</script>

<style scoped>
  #container {
    width: 88%;
    margin: 0 auto;
    height: 800px;
    overflow: hidden;
  }

  #menu {
    width: 10%;
    height: 800px;
    border: 1px solid #000;
  }

  .tabs {
    width: 400px;
    margin: 30px auto;
    border: 1px solid #eee;
    box-sizing: border-box;
  }

  .tabs nav {
    height: 40px;
    text-align: center;
    line-height: 40px;
    overflow: hidden;
    background-color: #06f;
    display: flex;
  }

  nav a {
    display: block;
    width: 100px;
    border-right: 1px solid #eee;
    color: #fff;
    text-decoration: none;
  }

  nav a:hover {
    color: #fff;
    text-decoration: none;
  }

  nav a:last-child {
    border-right: 0 none;
  }

  nav a.active {
    background: #000;
    color: #fff;
    text-decoration: none;
  }

  .cont {
    overflow: hidden;
    display: none;
  }

  .cont ol {
    line-height: 30px;
  }

  .title {
    position: absolute;
    padding: 10px;
    background: rgba(255, 255, 255, 0.5);
    line-height: 1;
    border-radius: 5px;
  }

  .tap {
    position: absolute;
  }
</style>
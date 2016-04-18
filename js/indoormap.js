/**
 * @classdesc
 * The indoor map inherits from ol.Map. The parameter "floorSources" 
 * determines the data file urls of indoor map layers.
 *
 * The indoor map also includes a navigation layer to display the navigation 
 * route, and a highlight layer to highlight the chosen feature. Besides, an 
 * overlay was added to display the popup which contains feature information.
 *
 * @constructor
 * @extends {ol.Map}
 * @param {olx.MapOptions} options Map options.
 * @param {Array(string)} floorSources The the data file urls of indoor map 
 *     layers.
 */
function IndoorMap(options, floorSources) {
	
	ol.Map.call(this, options);
	
	//Used to get the map in closure.
	theMap = this;
	
	/**
	 * @type {number}
	 * @private
	 */
	this.floorNum_ = floorSources.length;

	/**
	 * The current floor of indoor map, the others will be hidden
	 * @type {number}
	 * @private
	 */
	this.currentFloor_ = 1;

	/**
	 * The current highlight feature.
	 * @type {ol.Feature}
	 * @private
	 */
	this.highlight_;
	
  //add the indoor map layers to map	
	for (var i = 0; i < this.floorNum_; i++)
	{
		var vectorLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
				url: floorSources[i],
				//indoor map uses the GeoJSON data
				format: new ol.format.GeoJSON({})
			}),
			style: floorStyleFunction()
		});
		this.addLayer(vectorLayer);
	}
	
	this.hideExceptCurrent();
	
	this.addHighlightFunction_();
	
	var container = document.getElementById('popup');
	//Create an overlay to anchor the popup to the map.
	this.popup_ = new ol.Overlay({
		element: container,
		autoPan: true,
		autoPanAnimation: {
			duration: 250
		}
	});
	this.popup_.setPosition(undefined);
	this.addOverlay(this.popup_);
	
	this.addShowDetailsFunction_();
	
	//Add floor switch controls.
	this.addControl(new FloorSwitchControl(this));
	this.addControl(new UpstairsControl(this));
	this.addControl(new DownstairsControl(this));
	
	/**
	 * @type {ol.layer.Vector}
	 * @public
	 */
	this.navigationLayer_ = new ol.layer.Vector({
		source: new ol.source.Vector(),
		style: routeStyleFunction
	});
	this.addLayer(this.navigationLayer_);
	
	/**
	 * @type {ol.coordinate}
	 * @private
	 */
	 this.navStartPoint_;
	 this.navEndPoint_;
	 
	//navigation buttons
	var startButton = document.getElementById('popup-setStartPoint');
	var endButton = document.getElementById('popup-setEndPoint');
	startButton.onclick = function() {
		theMap.navStartPoint_ = theMap.popup_.getPosition();
		hidePopup();
		return false;
	}
	endButton.onclick = setEndPoint;
	//鼠标滚轮事件的监听函数：缩小到一定程度楼层隐藏
	this.on('postcompose', function(evt)
	{
		var mapLayers = this.getLayers();
		var layerNum = mapLayers.getLength();
		if (this.getView().getZoom() < 17)
		{
			mapLayers.item(this.currentFloor_).setVisible(false);
			mapLayers.item(layerNum - 1).setVisible(false);//导航路径层
		}
		else 
		{
			mapLayers.item(this.currentFloor_).setVisible(true);
			mapLayers.item(layerNum - 1).setVisible(true);//导航路径层
		}
	});
}
ol.inherits(IndoorMap, ol.Map);

/**
 *
 */
function getText(feature, resolution)
{
	var text = feature.get('name');
	
	if (resolution > 0.4)//硬编码了一个比较合适的隐藏注记的分辨率
		text = '';
		
	return text;
}

//读取图标和限制显示范围的函数
function getIcon(feature, resolution)
{
	var type = feature.get('type');
	var icon = new ol.style.Icon({ 
		src:'icon/image' + type + '.png',
		anchor: [0, 0]
	});
	
	if (resolution > 0.2)//硬编码了一个比较合适的隐藏图标的分辨率
		icon = null;
		
	return icon;
}

//设置室内数据的显示Style，主要是把text和icon显示出来，具体语法方面不是很懂(feature和resolution不用显式传递进去就能用？)
function floorStyleFunction() {
	return function(feature, resolution){
		var style;
		if (feature.getGeometry().getType() == 'Polygon')//如果是面类型，需要显示注记，设定好面的显示方式
		{
			style = new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#319FD3',
					width: 1
				}),
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.6)'
				}),
				text: new ol.style.Text({
					textAlign: 'center',
					textBaseline: 'bottom',
					stroke: new ol.style.Stroke({color: '#319FD3', width: 0.5}),
					text: getText(feature, resolution)
				})
			});
		}
		else if (feature.getGeometry().getType() == 'Point')//如果是点类型(楼梯口、出口、卫生间等),需要图标和注记
		{
			style = new ol.style.Style({
				image: getIcon(feature, resolution),
				text: new ol.style.Text({
					textAlign: 'center',
					textBaseline: 'bottom',
					stroke: new ol.style.Stroke({color: '#319FD3', width: 0.5}),
					text: getText(feature, resolution)
				})
			});
		}
		return [style];
	};
}

/**
 * @return {number} Floor number.
 * @api stable
 */
IndoorMap.prototype.getFloorNum = function() {
	return this.floorNum_;
}

/**
 * @return {number} Current floor.
 * @api stable
 */
IndoorMap.prototype.getCurrentFloor = function() {
	return this.currentFloor_;
}

IndoorMap.prototype.setCurrentFloor = function(number) {
	this.currentFloor_ = number;
}

/**
 * Hide all floor layers except the current floor.
 * @pravite
 */
IndoorMap.prototype.hideExceptCurrent = function() {
	var layers = this.getLayers();
	/**
	 * The first layer is the OSM map, which should not be hidden. And 
	 * floorNum_+1 make sure the hightlightLayer and the navigation layer
	 *  will not be included.
	 */
	for (var i = 1; i < this.floorNum_ + 1; i++){
		layers.item(i).setVisible(false);
	}
	layers.item(this.currentFloor_).setVisible(true);
}

/**
 * Add highlight function to show the indoor map better.
 * @pravite
 */
IndoorMap.prototype.addHighlightFunction_ = function() {
	//The layer used to highlight the chosen feature.
	var hightlightLayer = new ol.layer.Vector({
		source: new ol.source.Vector(),
		style: new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: '#f00',
				width: 1
			}),
			fill: new ol.style.Fill({
				color: 'rgba(255,0,0,0.1)'
			})
		})
	});
	this.addLayer(hightlightLayer);
	//theMap stores this, so theMap it's possible to get map context in 
	//highlightFeature function. why?
	var theMap = this;
	//高亮显示要素的函数
	function highlightFeature(pixel, coordinate) {
		//如果feature的type值为0，说明其为表示边界的面，无视它（不高亮显示）
		var feature = theMap.forEachFeatureAtPixel(pixel, function(feature, layer) {
			if (feature.get('type') != '0')
				return feature;
			else return null;
		});
		
		if (feature !== theMap.highlight_) {
			if (theMap.highlight_) {
				hightlightLayer.getSource().removeFeature(theMap.highlight_);
			}
			if (feature) {
				hightlightLayer.getSource().addFeature(feature);
			}
			theMap.highlight_ = feature;
		}
	}
	//鼠标移动事件的监听函数：移动到要素上时将要素高亮显示
	this.on('pointermove', function(evt) {
		if (evt.dragging) {
			return;
		}
		highlightFeature(evt.pixel, evt.coordinate);
		var info = document.getElementById('info');
		info.innerHTML = evt.coordinate[0] + ", " + evt.coordinate[1];
	});
}

IndoorMap.prototype.addShowDetailsFunction_ = function() {
	//Add elements that make up the popup. By now they are added in html, later I'll change that.
	var container = document.getElementById('popup');
	var content = document.getElementById('popup-content');
	var closer = document.getElementById('popup-closer');
	/**
	* Add a click handler to hide the popup.
	* @return {boolean} Don't follow the href.
	*/
	var theMap = this;
	closer.onclick = hidePopup;

	//显示要素信息的函数
	function showFeatureDetails(pixel, coordinate) {
		var feature = theMap.forEachFeatureAtPixel(pixel, function(feature, layer) {
			return feature;
		});
		
		var info = document.getElementById('info');
		if (feature) 
		{
			info.innerHTML = feature.getId() + ': ' + feature.get('name');
			content.innerHTML = feature.get('name') + ' and more details......';
			theMap.popup_.setPosition(coordinate);
		} 
		else 
		{
			info.innerHTML = '&nbsp;';
			hidePopup();
		}
	}
	
	this.on('click', function(evt) {
		showFeatureDetails(evt.pixel, evt.coordinate);
	});
	
}
	
function hidePopup() {
	theMap.popup_.setPosition(undefined);
	this.blur();
	return false;
}

//导航部分
//样式函数,导航路径上加个箭头
function routeStyleFunction(feature) {
	var geometry = feature.getGeometry();
	var styles = [
		// linestring
			new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: '#ffcc33',
				width: 2
				})
		})
	];

	geometry.forEachSegment(function(start, end) {
		var dx = end[0] - start[0];
			var dy = end[1] - start[1];
			var rotation = Math.atan2(dy, dx);
			// arrows
			styles.push(new ol.style.Style({
			geometry: new ol.geom.Point(end),
			image: new ol.style.Icon({
				src: 'icon/arrow.png',
				anchor: [0.75, 0.5],
				rotateWithView: false,
				rotation: -rotation
			})
		}));
	});

	return styles;
};

function setEndPoint() {
	//清除上一条导航路线
	if (theMap.navigationLayer_.getSource().getFeatures()) {
		theMap.navigationLayer_.getSource().clear();
	}
	theMap.navEndPoint_ = theMap.popup_.getPosition();
	var params = "x1=" + theMap.navStartPoint_[0] + "&y1=" + theMap.navStartPoint_[1]
							 + "&x2=" + theMap.navEndPoint_[0] + "&y2=" + theMap.navEndPoint_[1]; 
	var navigationRequest = new XMLHttpRequest();
	navigationRequest.onreadystatechange = function (){
		if (navigationRequest.readyState == 4)
		{
			//获得了服务器正确响应
			if ((navigationRequest.status >= 200 && navigationRequest.status < 300) || navigationRequest.status == 304)
			{
				var navPoints = navigationRequest.responseXML.getElementsByTagName('Point');
				var len = navPoints.length;
				for (var i = 0; i < len - 1; i++)
				{
					var beginPoint = [navPoints[i].getAttribute("x"), navPoints[i].getAttribute("y")];
					var endPoint = [navPoints[i + 1].getAttribute("x"), navPoints[i + 1].getAttribute("y")];
					var segment = new ol.Feature({
						'geometry': new ol.geom.LineString([beginPoint, endPoint])
					});
					theMap.navigationLayer_.getSource().addFeature(segment);
				}
			}
			else 
			{
				alert("Failed to get navigation information from server!");
			}
		}
	};
	navigationRequest.open("POST", "php/navigation.php", true);
	navigationRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	navigationRequest.send(params);
	
	hidePopup();
	return false;
}

/**
 * @classdesc
 * The FloorSwitchControl inherits from ol.control.Control, used to switch  
 * floors of indoor map. Several buttons will be added according to floor
 * numbers, each of them represents a certain floor. 
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {IndoorMap} IndoorMap the target indoor map
 */
function FloorSwitchControl(map) {
	var buttonsNum = map.getFloorNum();
	
	var element = document.createElement('div');
	element.className = 'floor-switch ol-unselectable ol-control';
	for (var i = 1; i < buttonsNum + 1; i++) {
		var button = document.createElement('button');
		button.innerHTML = 'F' + i;
		button.addEventListener('click', handleClick, false);
		button.value = i;
		element.appendChild(button);
	}

	function handleClick() {
		map.setCurrentFloor(this.value);
		map.hideExceptCurrent();
	}

	ol.control.Control.call(this, {
		element: element
	});
};
ol.inherits(FloorSwitchControl, ol.control.Control);

/**
 * @classdesc
 * The FloorSwitchControl inherits from ol.control.Control, used to switch  
 * floors of indoor map. Several buttons will be added according to floor
 * numbers, each of them represents a certain floor. 
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {IndoorMap} IndoorMap the target indoor map
 */
function UpstairsControl(map)
{
	var button = document.createElement('button');
	button.innerHTML = 'U';

	var handleUpstairs = function()
	{
		var currentFloor = map.getCurrentFloor();
		currentFloor++;
		var floorNum = map.getFloorNum();
		if (currentFloor > floorNum) {
			alert("No Higher Floor!");
		}
		else {
			map.setCurrentFloor(currentFloor);
			map.hideExceptCurrent();
		}
	};

	button.addEventListener('click', handleUpstairs, false);
	button.addEventListener('touchstart', handleUpstairs, false);

	var element = document.createElement('div');
	element.className = 'upstairs ol-unselectable ol-control';
	element.appendChild(button);

	ol.control.Control.call(this, 
	{
		element: element
	});

};
ol.inherits(UpstairsControl, ol.control.Control);

/**
 * @classdesc
 * The FloorSwitchControl inherits from ol.control.Control, used to switch  
 * floors of indoor map. Several buttons will be added according to floor
 * numbers, each of them represents a certain floor. 
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {IndoorMap} IndoorMap the target indoor map
 */
function DownstairsControl(map)
{
	var button = document.createElement('button');
	button.innerHTML = 'D';

	var handleDownstairs = function()
	{
		var currentFloor = map.getCurrentFloor();
		currentFloor--;
		//The compare condition should be modified later.
		if (currentFloor < 1) {
			alert("No Lower Floor!");
		}
		else {
			map.setCurrentFloor(currentFloor);
			map.hideExceptCurrent();
		}
	};

	button.addEventListener('click', handleDownstairs, false);
	button.addEventListener('touchstart', handleDownstairs, false);

	var element = document.createElement('div');
	element.className = 'downstairs ol-unselectable ol-control';
	element.appendChild(button);

	ol.control.Control.call(this, 
	{
		element: element
	});

};
ol.inherits(DownstairsControl, ol.control.Control);

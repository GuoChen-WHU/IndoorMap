function init() {
	//这里放配置数据，包括楼层数量和各楼层数据文件名称，应该由php读配置文件得到
	var options = {
		floorNum: 0,
		sources: [
		]
	};
	//从服务器读取配置数据
	var thePage = 'php/getOptions.php';
	var req = new XMLHttpRequest();
	req.onreadystatechange = function () {
		//获得了服务器正确响应
		if (req.readyState == 4) {
			if ((req.status >= 200 && req.status < 300) || req.status == 304) {
				var floorNum = req.responseXML.getElementsByTagName("floorNum")[0];
				options.floorNum = parseInt(floorNum.firstChild.nodeValue);
				var sourcePaths = req.responseXML.getElementsByTagName("sourcePaths")[0];
				var len = sourcePaths.childNodes.length;
				for (var i = 0; i < len; i++)
				{
					if(sourcePaths.childNodes[i].nodeType == 1)
					{
						options.sources[options.sources.length] = sourcePaths.childNodes[i].childNodes[0].nodeValue;
					}
				}
				
				var view = 	new ol.View({
					center: [12729278.3754, 3571600.1666],
					zoom: 17
				});
				var indoorMap = new IndoorMap({
					layers: [
						new ol.layer.Tile({
							source: new ol.source.OSM()
						})
					],
					target: 'map',
					view: view
				}, options.sources);
			}
		}
	}
	req.open("GET", thePage, true);
	req.send(null);

}
window.onload = init;
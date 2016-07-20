/*
 * im.map.js
 * Map module, deal with map dispaly and interactive
*/

im.map = (function () {

  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      settable_map : {
        mapModel: true
      },
      mapModel: null
    },
    stateMap  = { 
      $container : null,
      highlightLayer: null,
      highlightFeature: null
    },
    jqueryMap = {},

    setJqueryMap, configModule, initModule,
    setFloorStyle, getText, getIcon, 
    renderMap, panToCoordinate, getFeatureAtPixel, 
    highlightFeature, unHighlightFeature,
    onClickMap, onEnterMap, onEndChosen;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------

  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  setJqueryMap = function () {
    var $container = stateMap.$container;

    jqueryMap = { $container : $container };
  };
  // End DOM method /setJqueryMap/

  setFloorStyle = function( feature, resolution ) {
    var style;

    //如果是面类型，需要显示注记
    if ( feature.getGeometry().getType() === 'Polygon' )
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
    //如果是点类型(楼梯口、出口、卫生间等),需要图标和注记
    else if ( feature.getGeometry().getType() === 'Point' )
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

  getText = function ( feature, resolution )
  {
    var text = feature.get('name');
    
    //硬编码了一个比较合适的隐藏注记的分辨率
    if (resolution > 0.4)
      text = '';
      
    return text;
  };

  getIcon = function ( feature, resolution )
  {
    var 
      type = feature.get('type'),
      icon = new ol.style.Icon({ 
        src:'public/img/image' + type + '.png',
        anchor: [0, 0]
      });
    
    //硬编码了一个比较合适的隐藏图标的分辨率
    if (resolution > 0.2)
      icon = null;
      
    return icon;
  };
  
  // Begin DOM method /renderMap/
  renderMap = function () {
    var 
      map = configMap.mapModel,
      layers = map.getLayers(),
      floorIndexes = configMap.mapModel.getFloorIndexes();

    // Set map target and floor layers' display styles
    map.setTarget( stateMap.$container.get(0) );
    
    floorIndexes.forEach( function ( floorIndex ) {
      layers.item( floorIndex ).setStyle( setFloorStyle );
    });

    // Add a layer to hightlight feature
    stateMap.highlightLayer = new ol.layer.Vector({
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
    map.addLayer( stateMap.highlightLayer );
  };

  panToCoordinate = function ( coordinate ) {
    var 
      view = configMap.mapModel.getView(),
      currentCenter = view.getCenter();

    configMap.mapModel.beforeRender(
      new ol.animation.pan({
        duration: 500,
        source: currentCenter
      })
    );
    view.setCenter( coordinate );
  };

  getFeatureAtPixel = function ( pixel ) {
    var 
      map = configMap.mapModel,
      feature = null;

    if ( map.hasFeatureAtPixel( pixel ) ) {
      feature = map.forEachFeatureAtPixel( pixel, function ( feature ) {
        return feature;
      });
    }

    return feature;
  };

  highlightFeature = function ( feature ) {
    // Extent feature should not be highlighted
    if ( feature.get( 'type' ) === 0 ) {
      unHighlightFeature( stateMap.highlightFeature );
      return;
    }

    if ( feature !== stateMap.highlightFeature ) {
      if ( stateMap.highlightFeature ) {
        unHighlightFeature( stateMap.highlightFeature );
      }
      stateMap.highlightLayer.getSource()
        .addFeature( feature );
      stateMap.highlightFeature = feature;
    }
    return true;
  };

  unHighlightFeature = function ( feature ) {
    if ( feature ) {
      stateMap.highlightLayer.getSource()
        .removeFeature( feature );
      stateMap.highlightFeature = null;
    }
  };
  // End DOM method /renderMap/
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onClickMap = function ( event ) {
    var feature = getFeatureAtPixel( event.pixel );

    if ( feature ) {
      highlightFeature( feature );
      panToCoordinate( event.coordinate );
      im.util.gevent.trigger( 'featureChosen', event.coordinate, feature );
    }
  };

  onEnterMap = function ( event ) {
    var feature = getFeatureAtPixel( event.pixel );

    if ( feature ) {
      highlightFeature( feature );
    }
  };

  onEndChosen = function () {
    unHighlightFeature( stateMap.highlightFeature );
  };
  //-------------------- END EVENT HANDLERS --------------------



  //------------------- BEGIN PUBLIC METHODS -------------------
  // Begin public method /configModule/
  // Purpose    : Adjust configuration of allowed keys
  // Arguments  : A map of settable keys and values
  //   * color_name - color to use
  // Settings   :
  //   * configMap.settable_map declares allowed keys
  // Returns    : true
  // Throws     : none
  //
  configModule = function ( input_map ) {
    im.util.setConfigMap({
      input_map    : input_map,
      settable_map : configMap.settable_map,
      config_map   : configMap
    });
    return true;
  };
  // End public method /configModule/

  // Begin public method /initModule/
  // Purpose    : Initializes module
  // Arguments  :
  //  * $container the jquery element used by this feature
  // Returns    : true
  // Throws     : none
  //
  initModule = function ( $container ) {
    stateMap.$container = $container;
    setJqueryMap();
    renderMap();

    // Add events listener for map
    configMap.mapModel.on( 'click', onClickMap );
//    configMap.mapModel.on( 'pointermove', onEnterMap);

    im.util.gevent.listen( 'endChosen', onEndChosen );
  
    return true;
  };
  // End public method /initModule/

  // return public methods
  return {
    configModule : configModule,
    initModule   : initModule
  };
  //------------------- END PUBLIC METHODS ---------------------
}());

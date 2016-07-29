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
      mapModel: null,
      styleMap: {

        // Determine how the regions in the map show 
        regionStyle: {
          boundary: {
            strokeColor: '#DDD2C9',
            fillColor  : '#FFFDF8'
          },
          region_jewelry: {
            strokeColor: '#FBE1E3',
            fillColor  : '#F8F8F8'
          },
          region_luxury: {
            strokeColor: '#FBE1E3',
            fillColor  : '#FFEBED'
          },
          region_cosmetic: {
            strokeColor: '#FBE1E3',
            fillColor  : '#FFEBED'
          },
          region_shoe: {
            strokeColor: '#FBE1E3',
            fillColor  : '#FFEBED'
          },
          region_restaurant: {
            strokeColor: '#9ACBF0',
            fillColor  : '#B5DFFF'
          }
        },

        // Determine the max resolution when the text in the map show
        showTextResolution: 0.25,

        // Determine the max resolution when the icon in the map show
        showIconResolution: 0.25,

        // Determine the min resolution when the base map is hidden
        hideBaseResolution: 0.25,

        // Highlight layer styles
        highlightStyle: {
          strokeColor: '#FEB29B',
          fillColor: '#FFB69E'
        }
      }
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
    highlightFeature, unHighlightFeature, setBaseLayerVisible,
    onClickMap, onEnterMap, onPostcompose,
    onEndChosen,
    onCurrentFloorChange;
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
    var 
      style,
      regionStyle = configMap.styleMap.regionStyle;

    // If it's a region, display its name.
    if ( feature.getGeometry().getType() === 'Polygon' ) {
      style = new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: regionStyle[ feature.get( 'class' ) ].strokeColor,
          width: 1
        }),
        fill: new ol.style.Fill({
          color: regionStyle[ feature.get( 'class' ) ].fillColor
        }),
        text: new ol.style.Text({
          textAlign: 'center',
          textBaseline: 'bottom',
          text: getText(feature, resolution)
        })
      });
    }
    
    // If it's a point, display its name and an icon
    else if ( feature.getGeometry().getType() === 'Point' ) {
      style = new ol.style.Style({
        image: getIcon(feature, resolution),
        text: new ol.style.Text({
          textAlign: 'center',
          textBaseline: 'bottom',
          text: getText(feature, resolution)
        })
      });
    }
    return [style];
  };

  getText = function ( feature, resolution ) {
    var text = feature.get( 'name' );
    
    if ( resolution > configMap.styleMap.showTextResolution ) {
      text = '';
    }
      
    return text;
  };

  getIcon = function ( feature, resolution ) {
    var 
      type = feature.get('type'),
      icon = new ol.style.Icon({ 
        src: 'public/img/icon' + type + '.png',
        anchor: [0, 0]
      });
    
    if (resolution > configMap.styleMap.showTextResolution) {
      icon = null;
    }
      
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
          color: configMap.styleMap.highlightStyle.strokeColor
        }),
        fill: new ol.style.Fill({
          color: configMap.styleMap.highlightStyle.fillColor
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

    // Boundary feature should not be highlighted
    if ( feature.get( 'class' ) === 'boundary' ) {
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

  setBaseLayerVisible = function ( visible ) {
    configMap.mapModel.getLayers().item( 0 ).setVisible( visible );
  };
  // End DOM method /unHighlightFeature/
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onClickMap = function ( event ) {
    var feature = getFeatureAtPixel( event.pixel );

    if ( feature ) {
      highlightFeature( feature );
      panToCoordinate( event.coordinate );
      im.util.gevent.trigger( 'featureChosen', event.coordinate, feature );
    } else {
      im.util.gevent.trigger( 'nosenseClick' );
    }
  };

  onEnterMap = function ( event ) {
    var feature = getFeatureAtPixel( event.pixel );

    if ( feature ) {
      highlightFeature( feature );
    }
  };

  onPostcompose = function () {
    var resolution = configMap.mapModel.getView().getResolution();

    if ( resolution < configMap.styleMap.hideBaseResolution ) {
      setBaseLayerVisible( false );
    } else {
      setBaseLayerVisible( true );
    }
  };

  onEndChosen = function () {
    unHighlightFeature( stateMap.highlightFeature );
  };

  onCurrentFloorChange = function () {
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
    configMap.mapModel.on( 'postcompose', onPostcompose);

    im.util.gevent.listen( 'endChosen', onEndChosen );
    im.util.gevent.listen( 'currentFloorChange', onCurrentFloorChange );
  
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

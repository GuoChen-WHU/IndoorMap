/*
 * im.js
 * Root namespace module
*/

/* jshint unused: false */ 
/* globals im: true*/
var im = (function () {
  'use strict';

  var initModule = function ($container) {
    im.model.initModule();
    im.shell.initModule($container);
  };

  return {
    initModule: initModule
  };
}());
/*
 * im.util.js
 * General JavaScript utilities
 * 
*/

im.util = (function () {
  var makeError, setConfigMap;

  // Begin public constructor /makeError/
  // Purpose: a convenience wrapper to create an error object
  // Arguments:
  //   * name_text - the error name
  //   * msg_text  - long error message
  //   * data      - optional data attached to error object
  // Returns : newly constructed error object
  // Throws  : none
  //
  makeError = function ( name_text, msg_text, data ) {
    var error = new Error();
    error.name = name_text;
    error.message = msg_text;

    if ( data) {
      error.data = data;
    }

    return error;
  };
  // End public constructor /makeError/

  // Begin public method /setConfigMap/
  // Purpose: Common code to set configs in feature modules
  // Arguments:
  //   * input_map    - map of key-values to set in config
  //   * settable_map - map of allowable keys to set
  //   * config_map   - map to apply settings to
  // Returns: true
  // Throws: Exception if input key not allowed
  //
  setConfigMap = function ( arg_map ) {
    var
      input_map = arg_map.input_map,
      settable_map = arg_map.settable_map,
      config_map = arg_map.config_map,
      key_name, error;

    for ( key_name in input_map ) {
      if ( input_map.hasOwnProperty( key_name ) ) {
        if ( settable_map.hasOwnProperty( key_name ) ) {
          config_map[key_name] = input_map[key_name];
        }
        else {
          error = makeError( 'Bad Input',
            'Setting config key |' + key_name + '| is not supported'
          );
          throw error;
        }
      }
    }
  };
  // End public method /setConfigMap/

  return {
    makeError: makeError,
    setConfigMap: setConfigMap
  };
}());
/*
 * im.util.gevent.js
 * Global event module, realize global events so that modules can
 * conmunication with each other.
 * The codes are copied from the book 《JavaScript设计模式与开发实践》
*/

im.util.gevent = (function () {

  var 
    Event,
    _default = 'default';

  Event = function () { // 为啥还套一层？
    var _listen,
        _trigger,
        _remove,
        _shift = Array.prototype.shift,
        _unshift = Array.prototype.unshift,
        namespaceCache = {},
        _create,
        each = function ( ary, fn ) {// 跟数组自带的each相比多一个返回值，只返回最后一个函数的返回值？
          var ret;
          for ( var i = 0, l = ary.length; i < l; i++ ) {
            var n = ary[i];
            ret = fn.call( n, i, n );
          }
          return ret;
        };

    _listen = function ( key, fn, cache ) {
      if ( !cache[ key ] ) {
        cache[ key ] = [];
      }
      cache[ key ].push( fn );
    };

    _remove = function ( key, cache, fn ) {
      if ( cache[ key ] ) {
        if ( fn ) {
          for ( var i = cache[ key ].length; i >= 0; i-- ) {
            if ( cache[ key ][i] === fn ) {
              cache[ key ].splice( i, 1 );
            }
          }
        } else {
          cache[ key ] = [];
        }
      }
    };

    _trigger = function () { // arguments是cache, 事件名, 数据
      var cache = _shift.call( arguments ),
          key = _shift.call( arguments ),
          args = arguments, // 这里剩下数据
          _self = this, // 这个this值是im.util.gevent
          stack = cache[ key ];

      if ( !stack || !stack.length ) {
        return;
      }

      return each( stack, function () {
        return this.apply( _self, args ); // 这个this值是stack中的每一个函数，为啥传进来的索引(i)和函数本身(n)这里都没有用到？
      });
    };

    _create = function ( arg_namespace ) {
      var namespace = arg_namespace || _default,
          cache = {},
          offlineStack = [],
          lastOffline,
          ret = {
            listen: function ( key, fn, last ) {
              _listen( key, fn, cache );
              if ( offlineStack === null ) {
                return;
              }
              if ( last === 'last' ) { // last是可选项， 如果传入'last'的话只触发最后一个
                if ( offlineStack.length > 0 ) {
                  lastOffline = offlineStack.pop();
                  lastOffline();
                }
              } else {
                each( offlineStack, function () {
                  this(); // 这里也没有用到传进来的索引和函数本身啊= =
                });
              }

              offlineStack = null;
            },
            one: function ( key, fn, last ) {
              _remove( key, cache );
              this.listen( key, fn, last );
            },
            remove: function ( key, fn ) {
              _remove( key, cache, fn );
            },
            trigger: function () {
              var fn,
                  args,
                  _self = this; // 是im.util.gevent

              _unshift.call( arguments, cache );
              args = arguments; // 现在是cache, 事件名, 数据
              fn = function () {
                return _trigger.apply( _self, args ); // 把cache, 事件名, 数据传进去
              };

              if ( offlineStack ) {
                return offlineStack.push( fn ); // 返回离线事件的数量
              }
              return fn(); // 返回对应事件的最后一个监听函数的返回值，这俩返回值其实都没有用到= =
            }
          };

      return namespace ? // namespace始终不会为空啊= =
          ( namespaceCache[ namespace ] ? namespaceCache[ namespace ] :
                namespaceCache[ namespace ] = ret )
                    : ret;
    };

    return {
      create: _create,
      one: function ( key, fn, last ) {
        var event = this.create();
        event.one( key, fn, last );
      },
      remove: function ( key, fn ) {
        var event = this.create();
        event.remove( key, fn );
      },
      listen: function ( key, fn, last ) {
        var event = this.create();
        event.listen( key, fn, last );
      },
      trigger: function () {
        var event = this.create();
        event.trigger.apply( this, arguments ); // arguments是事件名字和数据
      }
    };
  }();

  return Event;

}());
/*
 * im.model.js
 * Model module for im
 * Deal with the logic and data
*/

/* global XMLHttpRequest */

im.model = (function () {

  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      settable_map : {}
    },
    stateMap  = {
      map: new ol.Map({}),
      layerIndexMap: {},
      currentFloor: undefined
    },

    configModule, initModule, 
    refreshMap,
    navModel;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  // The map object API
  // ---------------------
  // The map object is available at im.model.map.
  // The map object is an extend of ol.Map, it provides methods 
  // and events to manage an indoor map. Its public methods include:
  //   * getFloorNum() - return the number of floors.
  //   * getFloorIndexes() - return the indexes of floors in the layers
  //     collection.
  //   * getFloorName( <index> ) - return the floor name of certain index.
  //   * getCurrentFloor() - get the current floor displayed in the map.
  //   * setCurrentFloor( <index> ) - set the current floor, when the  
  //     index is illegal, throw an error.
  // 
  // It's private method include:
  //   * refreshMap() - get the data from server.
  //
  refreshMap = function () {
    stateMap.map.addLayer( 
      new ol.layer.Tile({
        source: new ol.source.OSM()
      })
    );
    stateMap.map.addLayer( 
      new ol.layer.Vector({
        source: new ol.source.Vector({
          url: 'geojson/floor1.geojson',
          format: new ol.format.GeoJSON({})
        })
      })
    );
    stateMap.map.addLayer( 
      new ol.layer.Vector({
        source: new ol.source.Vector({
          url: 'geojson/floor2.geojson',
          format: new ol.format.GeoJSON({})
        }),
        visible: false
      })
    );    
    stateMap.map.addLayer( 
      new ol.layer.Vector({
        source: new ol.source.Vector({
          url: 'geojson/floor3.geojson',
          format: new ol.format.GeoJSON({})
        }),
        visible: false
      })
    );
    stateMap.map.addLayer( 
      new ol.layer.Vector({
        source: new ol.source.Vector({
          url: 'geojson/floor4.geojson',
          format: new ol.format.GeoJSON({})
        }),
        visible: false
      })
    );
    stateMap.map.setView(
      new ol.View({
        center: [ 12729367.950011384, 3571545.82468905 ],
        zoom: 0,
        minResolution: 0.07464553543474244,
        maxResolution: 0.29858214173896974
      })
    );

    // Update the layerIndexMap
    stateMap.layerIndexMap = {
      'F1': 1,
      'F2': 2,
      'F3': 3,
      'F4': 4
    };

    // Set the current floor
    stateMap.map.setCurrentFloor( 1 );
  };

  // Add methods to map model
  ol.Map.prototype.getFloorNum = function () {
    return this.getLayers().getLength() - 1;
  };

  ol.Map.prototype.getFloorIndexes = function () {
    var 
      layername, 
      indexes = [];

    for ( layername in stateMap.layerIndexMap ) {
      if ( stateMap.layerIndexMap.hasOwnProperty( layername ) ) {
        indexes.push( stateMap.layerIndexMap[ layername ] );
      }
    }

    return indexes;
  };

  ol.Map.prototype.getFloorName = function ( index ) {
    var layername;

    for ( layername in stateMap.layerIndexMap ) {
      if ( stateMap.layerIndexMap.hasOwnProperty( layername ) ) {
        if ( stateMap.layerIndexMap[ layername ] === index ) {
          return layername;
        }
      }
    }
    return false;
  };

  ol.Map.prototype.getCurrentFloor = function () {
    return stateMap.currentFloor;
  };

  ol.Map.prototype.setCurrentFloor = function ( index ) {
    var 
      settableIndexes = this.getFloorIndexes(), 
      formalIndex = stateMap.currentFloor,
      layers;

    // The floor is in the map, then display it and hide the
    // current. And publish a global event 'currentFloorChange'.
    if ( settableIndexes.indexOf( index ) !== -1 ) {

      if ( formalIndex === index ) {
        return;
      }

      layers = this.getLayers();

      // When init set of currentfloor, formal index is still undefined
      if ( formalIndex !== undefined ) {
        layers.item( formalIndex ).setVisible( false );
      }
      layers.item( index ).setVisible( true );
      stateMap.currentFloor = index;

      // Need a sperate namespace so that the floorcontrol module
      // can get the init set event as an offline event. See more
      // at floorcontrol module.
      im.util.gevent.create( 'toFloorControl' )
          .trigger( 'currentFloorChange', formalIndex, index );

      // The other modules don't need the init set event. Just put
      // the floor change event in default namespace.
      im.util.gevent
          .trigger( 'currentFloorChange', formalIndex, index );
    }

    // Else, throw an error
    else {
      throw im.util.makeError( 'setCurrentFloorError', 
        'The floor indented is not settable' );
    }
  };

  // The navigation object API
  // ---------------------
  // The navigation object is available at im.model.navigation.
  // The navigation object provides methods and events for navigation.
  // Its public methods include:
  //   * setStartPoint( coordinate ) - set the start point of navigation.
  //   * setEndPoint( coordinate ) - set the end point of navigation and
  //     request to the server for the nav route.
  //
  // Its pravite methods include:
  //   * getRoute() - generate an Ajax request to get the nav route, when
  //     the route is responsed from the server, publish the global event
  //     'routeGenerated'.
  //
  navModel = (function () {
    var
      startPoint, endPoint,
      setStartPoint, setEndPoint,
      getRoute;

    setStartPoint = function ( coordinate ) {
      startPoint = coordinate;
    };

    setEndPoint = function ( coordinate ) {
      endPoint = coordinate;
      getRoute();
    };

    // Request to server for route, when route ready, publish a global
    // event with the route data
    getRoute = function() {
      var 
        params = 'x1=' + startPoint[0] + '&y1=' + startPoint[1] +
                 '&x2=' + endPoint[0] + '&y2=' + endPoint[1], 
        navRequest = new XMLHttpRequest();

      navRequest.onreadystatechange = function () {
        var navPoints, len, i, start, end, segment, route = [];

        if ( navRequest.readyState == 4 ) {
          if ( ( navRequest.status >= 200 && navRequest.status < 300 ) ||
              navRequest.status == 304 ) {
            navPoints = navRequest.responseXML
                .getElementsByTagName( 'Point' );
            len = navPoints.length;
            for ( i = 0; i < len - 1; i++ ) {
              start = [ navPoints[ i ].getAttribute( 'x' ), 
                        navPoints[ i ].getAttribute( 'y' ) ];
              end = [ navPoints[ i + 1 ].getAttribute( 'x' ),
                      navPoints[ i + 1 ].getAttribute( 'y' ) ];
              segment = new ol.Feature({
                'geometry': new ol.geom.LineString( [ start, end ] )
              });
              route.push(segment);
            }
            im.util.gevent.trigger( 'routeGenerated', route );
          } else {
            throw im.util.makeError( 'Response Error', 
                'Failed to get navigation information from server!' );
          }
        }
      };
      navRequest.open( 'POST', 'php/navigation.php', false );
      navRequest.setRequestHeader( 'Content-Type', 
          'application/x-www-form-urlencoded' );
      navRequest.send(params);
    };

    return {
      setStartPoint: setStartPoint,
      setEndPoint  : setEndPoint
    };

  }());

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
  initModule = function () {

    refreshMap();

    return true;
  };
  // End public method /initModule/

  // return public methods
  return {
    configModule : configModule,
    initModule   : initModule,
    mapModel     : stateMap.map,
    navModel     : navModel
  };
  //------------------- END PUBLIC METHODS ---------------------
}());

/*
 * im.shell.js
 * Shell module for the indoormap system
*/

im.shell = (function () {
  'use strict';
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      mainHTML : '<div id="map" class="map"></div>'
    },
    stateMap  = { 
      $container : null 
    },
    jqueryMap = {},

    setJqueryMap, configModule, initModule;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
  // example : getTrimmedString
  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  setJqueryMap = function () {
    var $container = stateMap.$container;

    jqueryMap = { 
      $container : $container,
      $map       : $container.find('.map')
    };
  };
  // End DOM method /setJqueryMap/
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  // example: onClickButton = ...
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
    $container.html(configMap.mainHTML);
    setJqueryMap();

    im.map.configModule({
      mapModel: im.model.mapModel
    });
    im.map.initModule( jqueryMap.$map );

    im.floorcontrol.configModule({
      mapModel: im.model.mapModel
    });
    im.floorcontrol.initModule();

    im.popup.configModule({
      mapModel: im.model.mapModel
    });
    im.popup.initModule();

    im.navigation.configModule({
      mapModel: im.model.mapModel,
      navModel: im.model.navModel,
      getPosition: im.popup.getPosition
    });
    im.navigation.initModule( im.popup.getPopupContainer() );

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

/*
 * im.floorcontrol.js
 * Floor Control module
 * Click to switch floors
*/

im.floorcontrol = (function () {

  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      settable_map : { mapModel: true },
      mapModel: null,
      mainHTML: 
        '<div class="floorcontrol ol-unselectable ol-control">' +
          '<button class="upstairs">↑</button>' +
          '<div class="floorswitch"></div>' +
          '<button class="downstairs">↓</button>' +
        '</div>'
    },
    jqueryMap = {},

    configModule, initModule,
    createControl,
    onSwitchFloor, onUpstairs, onDownstairs, onCurrentFloorChange;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------

  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  createControl = function () {
    var 
      $floorControlEle, $floorSwitchEle, floorControl,
      floorIndexes, floorName, 
      $switchButton, $upstairsButton, $downstairsButton;

    $floorControlEle = $( configMap.mainHTML );
    $floorSwitchEle = $floorControlEle.find('.floorswitch');
    $upstairsButton = $floorControlEle.find('.upstairs');
    $downstairsButton = $floorControlEle.find('.downstairs');

    // Set the jqueryMap
    jqueryMap.$upstairs    = $upstairsButton;
    jqueryMap.$downstairs  = $downstairsButton;
    jqueryMap.$switchesMap = {};

    // The default floor indexes sorted from lower floor to 
    // higher floor, reverse it to make the buttons display
    // in approperiate order
    floorIndexes = configMap.mapModel.getFloorIndexes().reverse();
    floorIndexes.forEach( function ( floorIndex ) {
      floorName = configMap.mapModel.getFloorName( floorIndex );
      $switchButton = $( '<button>' + floorName + '</button>' );
      $switchButton.attr( 'value', floorIndex );

      jqueryMap.$switchesMap[ floorIndex ] = $switchButton;

      // jQuery will set this automatically
      $switchButton.click( onSwitchFloor );
      $floorSwitchEle.append( $switchButton );
    });

    $upstairsButton.click( onUpstairs );
    $downstairsButton.click( onDownstairs );

    floorControl = new ol.control.Control({

      // .get(0) transforms the jQuery object to the DOM object
      element: $floorControlEle.get(0)
    });

    configMap.mapModel.addControl( floorControl );
  };


  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onSwitchFloor = function () {
    configMap.mapModel.setCurrentFloor( parseInt(this.value) );
  };

  onUpstairs = function () {
    var currentFloor = configMap.mapModel.getCurrentFloor();
    currentFloor++;
    try {
      configMap.mapModel.setCurrentFloor( currentFloor );
    } catch ( error ) {
      alert( 'No higher floor' );
    }
  };

  onDownstairs = function () {
    var currentFloor = configMap.mapModel.getCurrentFloor();
    currentFloor--;
    try {
      configMap.mapModel.setCurrentFloor( currentFloor );
    } catch ( error ) {
      alert( 'No lower floor' );
    }
  };

  // Change the floor controls styles
  onCurrentFloorChange = function ( formalIndex, nowIndex ) {
    var indexes = configMap.mapModel.getFloorIndexes();

    // When init the map, formal index will be undefined
    if ( formalIndex !== undefined ) {
      jqueryMap.$switchesMap[ formalIndex ].removeClass( 'current-floor' );
    }
    jqueryMap.$switchesMap[ nowIndex ].addClass( 'current-floor' );

    // If current is the highest floor, set the upstairs control
    // to be unclickable.
    if ( nowIndex === Math.max.apply( null, indexes ) ) {
      jqueryMap.$upstairs.addClass( 'unclickable' );
    } else {
      jqueryMap.$upstairs.removeClass( 'unclickable' );
    } 

    if ( nowIndex === Math.min.apply( null, indexes ) ) {
      jqueryMap.$downstairs.addClass( 'unclickable' );
    } else {
      jqueryMap.$downstairs.removeClass( 'unclickable' );
    }
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
  initModule = function () {
    createControl();

    // Listen global events.
    // Model module is inited before floorcontrol, the init set of 
    // current floor event is published before floorcontrol module
    // is inited, so here we need offline events. In order to avoid
    // conflict with other events on default namespace, we create 
    // the namespace 'toFloorControl' to get the init set of current
    // floor event as we expect.
    im.util.gevent.create( 'toFloorControl' )
        .listen( 'currentFloorChange', onCurrentFloorChange );

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

/*
 * im.popup.js
 *
 * Popup model, display the popup and show feature details. 
*/

im.popup = (function () {

  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      settable_map : {
        mapModel: true
      },
      mainHTML: 
        '<div class="im-popup">' +
          '<div class="im-popup-header"></div>' +
          '<div class="im-popup-nav">' +
            '<a href="#" class="im-popup-setting"></a>' +
            '<a href="#" class="im-popup-closer"></a>' +
          '</div>' +
          '<div class="im-popup-content"></div>' +
       '</div>',
      mapModel: null
    },
    stateMap  = {
      popup: null
    },
    jqueryMap = {},

    configModule, initModule,
    createPopup, hidePopup,
    onClickCloser, onChooseFeature, onNosenseClick,
    onCurrentFloorChange;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
  // example : getTrimmedString
  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  // End DOM method /setJqueryMap/
  createPopup = function () {
    var 
      $popup = $( configMap.mainHTML ),
      $popupContent = $popup.find( '.im-popup-content' ),
      $popupCloser = $popup.find( '.im-popup-closer'),
      popup = new ol.Overlay({
        element: $popup.get( 0 ),
        autoPan: true,
        autoPanAnimation: {
          duration: 250
        }
      });

    configMap.mapModel.addOverlay( popup );
    stateMap.popup = popup;

    // Save jqueryMap
    jqueryMap.$popup = $popup;
    jqueryMap.$popupContent = $popupContent;

    $popupCloser.click( onClickCloser );
  };

  hidePopup = function () {

    // If the popup is displayed, a feature was chosen, need to publish
    // a global event.
    if ( stateMap.popup.getPosition() ) {
      stateMap.popup.setPosition( undefined );
      im.util.gevent.trigger( 'endChosen' );
    }
  };
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onClickCloser = function () {
    hidePopup();
  };

  onChooseFeature = function ( coordinate, feature ) {
    var info = feature.get( 'name' );

    jqueryMap.$popupContent.html( info );
    stateMap.popup.setPosition( coordinate );
  };

  onNosenseClick = function () {
    hidePopup();
  };

  onCurrentFloorChange = function () {
    hidePopup();
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
  initModule = function () {
    createPopup();

    // Subscribe global events
    im.util.gevent.listen( 'featureChosen', onChooseFeature );
    im.util.gevent.listen( 'nosenseClick', onNosenseClick );
    im.util.gevent.listen( 'currentFloorChange', onCurrentFloorChange );

    return true;
  };
  // End public method /initModule/

  // return public methods
  return {
    configModule : configModule,
    initModule   : initModule,

    // These two public method are used to let other modules add content
    // on the popup or use the popup position info.
    getPopupContainer: function () { return jqueryMap.$popup; },
    getPosition  : function () { return stateMap.popup.getPosition(); }
  };
  //------------------- END PUBLIC METHODS ---------------------
}());

/*
 * im.navigation.js
 * Navigation module
 * 
*/

im.navigation = (function () {

  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = {
      settable_map : { 
        mapModel: true,
        navModel: true,
        getPosition: true
      },
      mapModel: null,
      navModel: null,
      getPosition: null,
      mainHTML:
        '<div class="im-navigation">' + 
          '<span id="im-navigation-start" title="从这里出发" class="octicon octicon-sign-out"></span>' +
          '<span id="im-navigation-end" title="到这里去" class="octicon octicon-sign-in"></span>' + 
        '</div>'
    },
    stateMap  = { 
      $container : null,
      navLayer: null
    },
    jqueryMap = {},

    setJqueryMap, configModule, initModule,
    onStartNav, onEndNav, onRouteReady,
    setRouteStyle, displayRoute;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
  // example : getTrimmedString
  //-------------------- END UTILITY METHODS -------------------

  //--------------------- BEGIN DOM METHODS --------------------
  // Begin DOM method /setJqueryMap/
  setJqueryMap = function () {
    var $container = stateMap.$container;

    jqueryMap = { 
      $container : $container,
      $start : $container.find( '#im-navigation-start' ),
      $end : $container.find( '#im-navigation-end' )
    };
  };
  // End DOM method /setJqueryMap/

  setRouteStyle = function ( feature ) {
    var 
      geometry = feature.getGeometry(),
      styles = [
        // linestring
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
          })
        })
      ];

    geometry.forEachSegment( function( start, end ) {
      var 
        dx = end[0] - start[0],
        dy = end[1] - start[1],
        rotation = Math.atan2( dy, dx );
        // arrows
        styles.push( new ol.style.Style({
          geometry: new ol.geom.Point( end ),
          image: new ol.style.Icon({
            src: 'public/img/arrow.png',
            anchor: [ 0.75, 0.5 ],
            rotateWithView: false,
            rotation: -rotation
          })
        }));
    });

    return styles;
  };

  displayRoute = function ( route ) {
    var routeSource = stateMap.navLayer.getSource();
    if ( routeSource.getFeatures() ) {
      routeSource.clear();
    }
    routeSource.addFeatures( route );
  };
  //---------------------- END DOM METHODS ---------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  onStartNav = function () {
    var startPoint = configMap.getPosition();

    configMap.navModel.setStartPoint( startPoint );
  };

  onEndNav = function () {
    var endPoint = configMap.getPosition();

    configMap.navModel.setEndPoint( endPoint );
  };

  onRouteReady = function ( route ) {
    displayRoute( route );
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
    $container.append( $( configMap.mainHTML ) );
    setJqueryMap();

    // Add a layer to map to display navgation routes
    stateMap.navLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: setRouteStyle
    });
    configMap.mapModel.addLayer( stateMap.navLayer );

    jqueryMap.$start.click( onStartNav );
    jqueryMap.$end.click( onEndNav );

    // Subscribe the route ready event
    im.util.gevent.listen( 'routeGenerated', onRouteReady );

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

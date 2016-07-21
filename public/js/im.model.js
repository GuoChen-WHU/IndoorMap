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
        center: [12729278.3754, 3571600.1666],
        zoom: 17,
        minResolution: 0.07464553543474244
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
    stateMap.currentFloor = 1;
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
    var settableIndexes = this.getFloorIndexes(), layers;

    // The floor is in the map, then display it and hide the
    // current.
    if ( settableIndexes.indexOf( index ) !== -1 ) {
      layers = this.getLayers();
      layers.item( stateMap.currentFloor ).setVisible( false );
      layers.item( index ).setVisible( true );
      stateMap.currentFloor = index;
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

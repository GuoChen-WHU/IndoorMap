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
  //   * get_user() - return the current user person object.
  //     If the current user is not signed-in, an anonymous person
  //     object is returned.
  //   * get_db() - return the TaffyDB database of all the person
  //     objects - including the current user - presorted.
  //   * get_by_cid( <client_id> ) - return a person object with
  //     provided unique id.
  //   * login( <user_name> ) - login as the user with the provided
  //     user name. The current user object is changed to reflect
  //     the new identity. Successful completion of login
  //     publishes a 'spa-login' global custom event.
  //   * logout()- revert the current user object to anonymous.
  //     This method publishes a 'spa-logout' global custom event.
  //
  // jQuery global custom events published by the object include:
  //   * spa-login - This is published when a user login process
  //     completes. The updated user object is provided as data.
  //   * spa-logout - This is published when a logout completes.
  //     The former user object is provided as data.
  //
  // Each person is represented by a person object.
  // Person objects provide the following methods:
  //   * get_is_user() - return true if object is the current user
  //   * get_is_anon() - return true if object is anonymous
  //
  // The attributes for a person object include:
  //   * cid - string client id. This is always defined, and
  //     is only different from the id attribute
  //     if the client data is not synced with the backend.
  //   * id - the unique id. This may be undefined if the
  //     object is not synced with the backend.
  //   * name - the string name of the user.
  //   * css_map - a map of attributes used for avatar
  //     presentation.
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

//  hideExcept = function () {

  //};

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
  // The navigation object provides functions for navigation.
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

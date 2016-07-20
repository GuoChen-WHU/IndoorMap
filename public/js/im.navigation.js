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
        '<a href="#" id="im-navigation-start" class="im-navigation-button"></a>' +
        '<a href="#" id="im-navigation-end" class="im-navigation-button"></a>'
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

  /* unused: false */
  onRouteReady = function ( route ) {
    displayRoute( route );
  };
  /* unused: true */
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

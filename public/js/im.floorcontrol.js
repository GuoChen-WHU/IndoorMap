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

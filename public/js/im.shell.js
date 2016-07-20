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
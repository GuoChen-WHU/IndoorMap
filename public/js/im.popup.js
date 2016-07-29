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

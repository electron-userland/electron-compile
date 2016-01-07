Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _libStore = require('../src/store');

var _libStore2 = _interopRequireDefault(_libStore);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _utilsFillShape = require('../utils/fill-shape');

var _utilsFillShape2 = _interopRequireDefault(_utilsFillShape);

var WindowStore = (function () {
  function WindowStore() {
    _classCallCheck(this, WindowStore);

    this.MAIN_WINDOW = 'MAIN_WINDOW';
    this.SINGLE_TEAM = 'SINGLE_TEAM';
    this.NOTIFICATIONS = 'NOTIFICATIONS';
    this.SSB = 'SSB';
  }

  _createClass(WindowStore, [{
    key: 'getWindows',
    value: function getWindows() {
      return _libStore2['default'].getEntry('windows');
    }
  }, {
    key: 'getWindow',
    value: function getWindow(id) {
      return this.getWindows()[id];
    }
  }, {
    key: 'getWindowData',
    value: function getWindowData(type, params) {
      return (0, _utilsFillShape2['default'])(_libStore2['default'].getState(), this.getWindowShape(type, params));
    }
  }, {
    key: 'getWindowShape',
    value: function getWindowShape(type, params) {
      switch (type) {
        case this.MAIN_WINDOW:
          return {
            app: true,
            settings: true,
            teams: true,
            events: true
          };

        case this.SINGLE_TEAM:
          // params=teamId
          var shape = {
            app: true,
            settings: true,
            teams: {}
          };
          shape.teams[params] = true;
          return shape;

        case this.NOTIFICATIONS:
          return {
            notifications: true,
            teams: true
          };
      }
      return {};
    }
  }, {
    key: 'addWindow',
    value: function addWindow(windowList, newWindow, type, params) {
      var update = {};
      update[newWindow.id] = {
        window: newWindow,
        type: type,
        params: params
      };
      return _lodash2['default'].assign({}, windowList, update);
    }
  }, {
    key: 'getShapeForWindow',
    value: function getShapeForWindow(winId) {
      var windowData = this.getWindows()[winId];
      return this.getWindowShape(windowData.type, windowData.params);
    }
  }, {
    key: 'reduce',
    value: function reduce(windows, action) {
      if (windows === undefined) windows = {};

      switch (action.type) {
        case 'ADD_WINDOW':
          return this.addWindow(windows, action.data.newWindow, action.data.windowType, action.data.params);
        default:
          return windows;
      }
    }
  }]);

  return WindowStore;
})();

exports['default'] = new WindowStore();
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9wYXVsL2NvZGUvdGlueXNwZWNrL3NsYWNrLXdpbnNzYi9zcmMvc3RvcmVzL3dpbmRvdy1zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O3dCQUFrQixjQUFjOzs7O3NCQUNsQixRQUFROzs7OzhCQUNBLHFCQUFxQjs7OztJQUVyQyxXQUFXO1dBQVgsV0FBVzswQkFBWCxXQUFXOztTQUVmLFdBQVcsR0FBRyxhQUFhO1NBQzNCLFdBQVcsR0FBRyxhQUFhO1NBQzNCLGFBQWEsR0FBRyxlQUFlO1NBQy9CLEdBQUcsR0FBRyxLQUFLOzs7ZUFMUCxXQUFXOztXQU9MLHNCQUFHO0FBQ1gsYUFBTyxzQkFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDbEM7OztXQUVRLG1CQUFDLEVBQUUsRUFBRTtBQUNaLGFBQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQzlCOzs7V0FFWSx1QkFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFO0FBQzFCLGFBQU8saUNBQVUsc0JBQU0sUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUN2RTs7O1dBRWEsd0JBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtBQUMzQixjQUFPLElBQUk7QUFDWCxhQUFLLElBQUksQ0FBQyxXQUFXO0FBQ25CLGlCQUFPO0FBQ0wsZUFBRyxFQUFFLElBQUk7QUFDVCxvQkFBUSxFQUFFLElBQUk7QUFDZCxpQkFBSyxFQUFFLElBQUk7QUFDWCxrQkFBTSxFQUFFLElBQUk7V0FDYixDQUFBOztBQUFBLEFBRUgsYUFBSyxJQUFJLENBQUMsV0FBVzs7QUFDbkIsY0FBSSxLQUFLLEdBQUc7QUFDVixlQUFHLEVBQUUsSUFBSTtBQUNULG9CQUFRLEVBQUUsSUFBSTtBQUNkLGlCQUFLLEVBQUUsRUFBRTtXQUNWLENBQUE7QUFDRCxlQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQztBQUMzQixpQkFBTyxLQUFLLENBQUM7O0FBQUEsQUFFZixhQUFLLElBQUksQ0FBQyxhQUFhO0FBQ3JCLGlCQUFPO0FBQ0wseUJBQWEsRUFBRSxJQUFJO0FBQ25CLGlCQUFLLEVBQUUsSUFBSTtXQUNaLENBQUE7QUFBQSxPQUNGO0FBQ0QsYUFBTyxFQUFFLENBQUM7S0FDWDs7O1dBRVEsbUJBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0FBQzdDLFVBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUNoQixZQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ3JCLGNBQU0sRUFBRSxTQUFTO0FBQ2pCLFlBQUksRUFBRSxJQUFJO0FBQ1YsY0FBTSxFQUFFLE1BQU07T0FDZixDQUFDO0FBQ0YsYUFBTyxvQkFBRSxNQUFNLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUN6Qzs7O1dBRWdCLDJCQUFDLEtBQUssRUFBRTtBQUN2QixVQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUMsYUFBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ2hFOzs7V0FFSyxnQkFBQyxPQUFPLEVBQU8sTUFBTSxFQUFFO1VBQXRCLE9BQU8sZ0JBQVAsT0FBTyxHQUFHLEVBQUU7O0FBQ2pCLGNBQU8sTUFBTSxDQUFDLElBQUk7QUFDaEIsYUFBSyxZQUFZO0FBQ2YsaUJBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUFBLEFBQ3BHO0FBQ0UsaUJBQU8sT0FBTyxDQUFDO0FBQUEsT0FDbEI7S0FDRjs7O1NBckVHLFdBQVc7OztxQkF3RUYsSUFBSSxXQUFXLEVBQUUiLCJmaWxlIjoiL1VzZXJzL3BhdWwvY29kZS90aW55c3BlY2svc2xhY2std2luc3NiL3NyYy9zdG9yZXMvd2luZG93LXN0b3JlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFN0b3JlIGZyb20gJy4uL2xpYi9zdG9yZSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZpbGxTaGFwZSBmcm9tICcuLi91dGlscy9maWxsLXNoYXBlJztcblxuY2xhc3MgV2luZG93U3RvcmUge1xuXG4gIE1BSU5fV0lORE9XID0gJ01BSU5fV0lORE9XJztcbiAgU0lOR0xFX1RFQU0gPSAnU0lOR0xFX1RFQU0nO1xuICBOT1RJRklDQVRJT05TID0gJ05PVElGSUNBVElPTlMnO1xuICBTU0IgPSAnU1NCJztcblxuICBnZXRXaW5kb3dzKCkge1xuICAgIHJldHVybiBTdG9yZS5nZXRFbnRyeSgnd2luZG93cycpO1xuICB9XG5cbiAgZ2V0V2luZG93KGlkKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0V2luZG93cygpW2lkXTtcbiAgfVxuXG4gIGdldFdpbmRvd0RhdGEodHlwZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIGZpbGxTaGFwZShTdG9yZS5nZXRTdGF0ZSgpLCB0aGlzLmdldFdpbmRvd1NoYXBlKHR5cGUsIHBhcmFtcykpO1xuICB9XG5cbiAgZ2V0V2luZG93U2hhcGUodHlwZSwgcGFyYW1zKSB7XG4gICAgc3dpdGNoKHR5cGUpIHtcbiAgICBjYXNlIHRoaXMuTUFJTl9XSU5ET1c6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhcHA6IHRydWUsXG4gICAgICAgIHNldHRpbmdzOiB0cnVlLFxuICAgICAgICB0ZWFtczogdHJ1ZSxcbiAgICAgICAgZXZlbnRzOiB0cnVlXG4gICAgICB9XG5cbiAgICBjYXNlIHRoaXMuU0lOR0xFX1RFQU06IC8vIHBhcmFtcz10ZWFtSWRcbiAgICAgIGxldCBzaGFwZSA9IHtcbiAgICAgICAgYXBwOiB0cnVlLFxuICAgICAgICBzZXR0aW5nczogdHJ1ZSxcbiAgICAgICAgdGVhbXM6IHt9XG4gICAgICB9XG4gICAgICBzaGFwZS50ZWFtc1twYXJhbXNdID0gdHJ1ZTtcbiAgICAgIHJldHVybiBzaGFwZTtcblxuICAgIGNhc2UgdGhpcy5OT1RJRklDQVRJT05TOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm90aWZpY2F0aW9uczogdHJ1ZSxcbiAgICAgICAgdGVhbXM6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgYWRkV2luZG93KHdpbmRvd0xpc3QsIG5ld1dpbmRvdywgdHlwZSwgcGFyYW1zKSB7XG4gICAgbGV0IHVwZGF0ZSA9IHt9O1xuICAgIHVwZGF0ZVtuZXdXaW5kb3cuaWRdID0ge1xuICAgICAgd2luZG93OiBuZXdXaW5kb3csXG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICB9O1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgd2luZG93TGlzdCwgdXBkYXRlKTtcbiAgfVxuXG4gIGdldFNoYXBlRm9yV2luZG93KHdpbklkKSB7XG4gICAgbGV0IHdpbmRvd0RhdGEgPSB0aGlzLmdldFdpbmRvd3MoKVt3aW5JZF07XG4gICAgcmV0dXJuIHRoaXMuZ2V0V2luZG93U2hhcGUod2luZG93RGF0YS50eXBlLCB3aW5kb3dEYXRhLnBhcmFtcyk7XG4gIH1cblxuICByZWR1Y2Uod2luZG93cyA9IHt9LCBhY3Rpb24pIHtcbiAgICBzd2l0Y2goYWN0aW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgJ0FERF9XSU5ET1cnOlxuICAgICAgICByZXR1cm4gdGhpcy5hZGRXaW5kb3cod2luZG93cywgYWN0aW9uLmRhdGEubmV3V2luZG93LCBhY3Rpb24uZGF0YS53aW5kb3dUeXBlLCBhY3Rpb24uZGF0YS5wYXJhbXMpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHdpbmRvd3M7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBXaW5kb3dTdG9yZSgpO1xuIl19
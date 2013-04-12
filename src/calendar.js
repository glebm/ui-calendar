/*
 *  AngularJs Fullcalendar Wrapper for the JQuery FullCalendar
 *  API @ http://arshaw.com/fullcalendar/
 *
 *  Angular Calendar Directive that takes in the [eventSources] nested array object as the ng-model and watches it deeply changes.
 *       Can also take in multiple event urls as a source object(s) and feed the events per view.
 *       The calendar will watch any eventSource array and update itself when a change is made.
 *
 */

angular.module('ui.calendar', [])
  .constant('uiCalendarConfig', {})
  .directive('uiCalendar', ['uiCalendarConfig', '$parse', function(uiCalendarConfig) {
  uiCalendarConfig = uiCalendarConfig || {};
  //returns calendar
  return {
    require: 'ngModel',
    scope: true,
    restrict: 'A',
    link: function(scope, elm, attrs) {
      var sources = scope.$eval(attrs.ngModel);
      var calendar = elm.html('');

      var options = { eventSources: sources };
      angular.extend(options, uiCalendarConfig, attrs.uiCalendar ? scope.$eval(attrs.uiCalendar) : {});
      calendar.fullCalendar(options);

      // Track changes in array by assigning numeric ids to each element and watching the scope for changes in those ids
      var changeWatcher = function(arraySource, fingerprint) {
        var self;
        var fingerprints = function() {
          var array = angular.isFunction(arraySource) ? arraySource() : arraySource;
          return array.map(function(el) {
            var fpn = fingerprint(el);
            map[fpn] = el;
            return fpn;
          });
        };
        // returns elements in that are in a but not in b
        // subtractAsSets([4, 5, 6], [4, 5, 7]) => [6]
        var subtractAsSets = function(a, b) {
          var result = [], inB = {}, i, n;
          for (i = 0, n = b.length; i < n; i++) {
            inB[b[i]] = true;
          }
          for (i = 0, n = a.length; i < n; i++) {
            if (!inB[a[i]]) {
              result.push(a[i]);
            }
          }
          return result;
        };

        // Map objects to fingerprints and vice-versa
        var map = {};

        var applyChanges = function(newFpns, oldFpns) {
          var i, n, el, fpn;
          var fpnChanges = {};
          var removedFpns = subtractAsSets(oldFpns, newFpns);
          for (i = 0, n = removedFpns.length; i < n; i++) {
            var removedFpn = removedFpns[i];
            el = map[removedFpn];
            delete map[removedFpn];
            // if the element wasn't removed but simply got a new fingerprint, its old fingerprint will show up here
            // if the fpn store has the new fingerprint, then the event is changed and not removed
            fpn = fingerprint(el);
            if (fpn === removedFpn) {
              self.onRemoved(el);
            } else {
              fpnChanges[fpn] = removedFpn;
              self.onChanged(el);
            }
          }
          var addedFpns = subtractAsSets(newFpns, oldFpns);
          for (i = 0, n = addedFpns.length; i < n; i++) {
            fpn = addedFpns[i];
            el = map[fpn];
            if (!fpnChanges[fpn]) {
              self.onAdded(el);
            }
          }
        };
        return self = {
          subscribe: function(scope) {
            scope.$watch(fingerprints, applyChanges, true);
          },
          onAdded: angular.noop,
          onChanged: angular.noop,
          onRemoved: angular.noop
        };
      };

      //= tracking sources added/removed
      var sourceSerialId = 1;
      var eventSourcesWatcher = changeWatcher(sources, function(source) {
        return source.__id || (source.__id = sourceSerialId++);
      });
      eventSourcesWatcher.subscribe(scope);
      eventSourcesWatcher.onAdded = function(source) {
        calendar.fullCalendar('addEventSource', source);
      };
      eventSourcesWatcher.onRemoved = function(source) {
        calendar.fullCalendar('removeEventSource', source);
      };

      //= tracking individual events added/changed/removed
      var allEvents = function() {
        // return sources.flatten(); but we don't have flatten
        var arraySources = [];
        for (var i = 0, srcLen = sources.length; i < srcLen; i++) {
          var source = sources[i];
          if (angular.isArray(source)) {
            arraySources.push(source);
          }
        }
        return Array.prototype.concat.apply([], arraySources);
      };
      var eventsWatcher = changeWatcher(allEvents, function(e) {
        // This extracts all the information we need from the event. http://jsperf.com/angular-calendar-events-fingerprint/3
        return "" + (e.id || '') + (e.title || '') + (e.url || '') + (+e.start || '') + (+e.end || '') +
            (e.allDay || false) + (e.className || '');
      });
      eventsWatcher.subscribe(scope);
      eventsWatcher.onAdded = function(event) {
        calendar.fullCalendar('renderEvent', event);
      };
      eventsWatcher.onRemoved = function(event) {
        calendar.fullCalendar('removeEvents', function(e) { return e === event; });
      };
      eventsWatcher.onChanged = function(event) {
        calendar.fullCalendar('updateEvent', event);
      };
    }
  };
}]);


(function() {
  var app = angular.module("enron", ['ngSanitize']);

  app.service('DataService', [
    '$http',
    function($http) {
      this.questions = [];

      this.getHistoryQuestions = function() {
        var questions = this.questions;
        return $http.get('/enron/api/history_questions').then(function(data) {
          // console.log("data retrieved: " + data);
          for (var i = 0; i < data.data.length; i++) {
            questions.push(data.data[i]);
          }
          return questions;
        });
      };

      this.addHistoryQuestion = function(newQuestion) {
        var req = {
          method: 'POST',
          url: '/enron/api/history_questions/',
          headers: {
            'Content-Type': 'application/json'
          },
          data: newQuestion
        };

        var questions = this.questions;
        $http(req).then(function() {
          console.log("Question inserted!");
          var data = questions.find( function( ele ) { 
            return ele.question == newQuestion.question;
					} );
          if (!data) {
						questions.unshift(newQuestion);
          }
        });
      };
    }
  ]);

  app.service('answerService', function() {
    this.answers = [];

    this.setAnswers = function(newObj) {
      for (var i = 0; i < newObj.length; i++) {
        this.answers[i] = newObj[i];
      }
    };

    this.getAnswers = function() {
      return this.answers;
    };
  });

  app.service('questionService', [
    '$http',
    'answerService',
    'DataService',
    function($http, answerService, DataService) {
    	this.optionGetters = {};
    	
    	this.setOptions = function(optionGetters) {
    		this.optionGetters = optionGetters;
    	}
    	
      this.submitQuestion = function(questionText) {
      	var options = {};
      	options.useEnron = this.optionGetters.useEnron();
      	options.useLiveQA = this.optionGetters.useLiveQA();
        var liveqaData = {
          'qid': '20130828153959AAtXAEs',
          'title': questionText,
          'body': '',
          'category': '',
          'options': options
        };

        // Send request from client side.
        // var req = { method : 'POST', url :
        // 'http://gold.lti.cs.cmu.edu:18072/liveqa',
        // headers : { 'Content-type' : 'application/json', 'Accept' :
        // 'application/json' },
        // data : JSON.stringify(liveqaData) };

        var req = {
          method: 'POST',
          url: '/enron/api/get_answers/',
          headers: {
            'Content-type': 'application/json',
            'Accept': 'application/json'
          },
          data: JSON.stringify(liveqaData)
        };

        return $http(req).then(function successCallback(response) {
          console.log("Question submitted! Result is:");
          console.log(response.data);
          console.log(response.status);

          var answers = [];
          var returnedAnswers = response.data.answers.candidates;
          for (var i = 0; i < returnedAnswers.length; i++) {
            // ZAL-NOTES: The actual params required for display
            answers.push({
              'id': i,
              'source': returnedAnswers[i].url,
              'shortUrl': returnedAnswers[i].shortUrl,
              'score': returnedAnswers[i].score,
              'body': returnedAnswers[i].bestAnswer
            });
          }
          console.log("answers: " + answers);
          answerService.setAnswers(answers);
          var newQuestion = {
            question: questionText
          };
          DataService.addHistoryQuestion(newQuestion);
        }, function errorCallback(response) {
          console.log("Question submission failed!");
          console.log(response.data);
          console.log(response.status);
        });
        // Testing code.
        // $http.get("http://jsonplaceholder.typicode.com/posts").success(function(data)
        // {
        // console.log("return " + data.length + " answers with the first
        // being " + data[0].id);
        // answerService.setAnswers(data);
        // });
      };
    }
  ]);

  app.config(function($interpolateProvider) {
    $interpolateProvider.startSymbol('[[[');
    $interpolateProvider.endSymbol(']]]');
  });

  console.log("app.js is loaded.");

  app.controller("Question", ["$scope", "DataService", "questionService", "answerService",
    function($scope, DataService, questionService, answerService) {
  	
  		$scope.useLiveQA = true;
  		$scope.useEnron = true;
  		
  		questionService.setOptions({
  			useLiveQA: function() { return $scope.useLiveQA; }, 
  			useEnron: function() { return $scope.useEnron; }
  		});

      this.questionText = ""; // initial value;

      this.submitQuestion = function() {
        console.log("QuestionText: " + this.questionText);

        return questionService.submitQuestion(this.questionText, {'useLiveQA': $scope.useLiveQA, 'useEnron': $scope.useEnron});

        // Zhong: keep the question text
        // this.questionText = "";
      };
    }
  ]);

  app.controller("Answer", ["$scope", "answerService", function($scope, answerService) {
    this.answers = answerService.getAnswers();
    this.thumbsUp = new Array(6);
    this.thumbsDown = new Array(6);
    for (var i = 0; i < 6; ++i) {
      this.thumbsUp[i] = false;
      this.thumbsDown[i] = false;
    }

    this.thumbsUp = function(answerID) {
      console.log("Thumbs up for answer {" + answerID + "}.")
      this.thumbsUp[answerID] = !this.thumbsUp[answerID];
      this.thumbsDown[answerID] = false;
    };

    this.thumbsDown = function(answerID) {
      console.log("Thumbs down for answer {" + answerID + "}.")
      this.thumbsDown[answerID] = !this.thumbsDown[answerID];
      this.thumbsUp[answerID] = false;
    };

  }]);

  app.controller("History", ["$scope", "DataService", "questionService",
    function($scope, DataService, questionService) {
      DataService.getHistoryQuestions().then(function(historyQuestions) {
        $scope.historyQuestions = historyQuestions;
        // console.log("History questions: " + $scope.historyQuestions);
      });

      // $scope.$watch(function() { return Service.getNumber(); },
      // function(value) { $scope.number = value; });

      this.askQuestion = function(s) {
        questionService.submitQuestion(s);
      };

    }
  ]);

  app.directive('loading', ['$http', function($http) {
    return {
      restrict: 'A',
      link: function(scope, elm, attrs) {
        scope.isLoading = function() {
          return $http.pendingRequests.length > 0;
        };

        scope.$watch(scope.isLoading, function(v) {
          if (v) {
            elm.show();
          } else {
            elm.hide();
          }
        });
      }
    };
  }]);

  app.directive('clickAndDisable', function() {
    return {
      scope: {
        clickAndDisable: '&'
      },
      link: function(scope, iElement, iAttrs) {
        iElement.bind('click', function() {
          iElement.prop('disabled',true);
          console.log("scope.clickAndDisble is " + scope.clickAndDisable);
          scope.clickAndDisable().finally(function() {
            iElement.prop('disabled',false);
          })
        });
      }
    };
  });

})();
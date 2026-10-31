	
	var Input =
	{
		pressing: {},
		pressed: {},
		
		LEFT:  37,
		UP:    38,
		RIGHT: 39,
		DOWN:  40,
		KEY_A: 65,
		KEY_S: 83,
		KEY_D: 68,
		SPACE: 32,
		CTRL:  17,
		
		clear: function()
		{
			this.pressed = {};
		},
		
		isPressed: function(keyCode)
		{
			return this.pressed[keyCode];
		},
		
		isPressing: function(keyCode)
		{
			return this.pressing[keyCode];
		},
		
		onKeydown: function(event)
		{
			this.pressing[event.keyCode] = true;
			this.pressed[event.keyCode]  = true;
		},
		
		onKeyup: function(event)
		{
			delete this.pressing[event.keyCode];
		}
	};
	
	window.addEventListener('keyup', function(event) { Input.onKeyup(event); }, false);
	window.addEventListener('keydown', function(event) { Input.onKeydown(event); }, false);
	
	function Level(screenWidth, screenHeight, container)
	{
		this.state       = null;
		this.renderer    = new Renderer(screenWidth, screenHeight, container);
		this.initialized = false;
		
		this.load = function(chamberData)
		{
			this.renderer.setSize(chamberData.size.width, chamberData.size.height);
			
			var chamber = new Chamber(chamberData);
			var subject = new Subject(chamberData.subject);
			
			this.state = new State(chamber, subject);
			
			if (!this.initialized)
			{
				this.initialized = true;
				window.onEachFrame(this.run());
			}
			
			this.render();
		}
		
		this.render = function()
		{
			this.renderer.render(this.state);
		}
		
		this.update = function(delta, input)
		{
			var updated = false;
			
			if (this.state)
			{
				updated = this.state.update(delta, input);
			}
			
			input.clear();
			
			return updated;
		}
		
		this.init();
	}
	
	Level.prototype.run = function()
	{
		var startTime = new Date().getTime();
		var that = this;
		
		return function()
		{
			var currentTime = new Date().getTime();
			var delta = (currentTime - startTime) / 1000;
			startTime = currentTime;
			
			var stateUpdated = that.update(delta, Input);
			
			if (stateUpdated)
			{
				that.render();
			}
		};
	};

	Level.prototype.init = function()
	{
		var onEachFrame;
		
		if (window.webkitRequestAnimationFrame)
		{
			onEachFrame = function(cb)
			{
				var _cb = function()
				{
					cb();
					webkitRequestAnimationFrame(_cb);
				}
				
				_cb();
			};
		}
		else if (window.mozRequestAnimationFrame)
		{
			onEachFrame = function(cb)
			{
				var _cb = function()
				{
					cb();
					mozRequestAnimationFrame(_cb);
				}
				
				_cb();
			};
		}
		else
		{
			onEachFrame = function(cb)
			{
				setInterval(cb, parseInt(1000 / 60));
			}
		}

		window.onEachFrame = onEachFrame;
	};
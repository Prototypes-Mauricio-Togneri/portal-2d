	
	function Subject(data)
	{
		this.x = data.x;
		this.y = data.y;
		this.direction = data.direction;
		this.box = null;
		
		this.getPointingDirection = function()
		{
			var result = {};
			result.x   = 0;
			result.y   = 0;
			
			if (this.direction == Direction.LEFT)
			{
				result.x = -1;
			}
			else if (this.direction == Direction.RIGHT)
			{
				result.x = 1;
			}
			
			if (this.direction == Direction.UP)
			{
				result.y = 1;
			}
			else if (this.direction == Direction.DOWN)
			{
				result.y = -1;
			}
			
			return result;
		}
		
		this.hasBox = function()
		{
			return this.box != null;
		}
		
		this.destroyBox = function()
		{
			this.box.reset();
			this.releaseBox();
		}
		
		this.setBox = function(box)
		{
			this.box = box;
		}
		
		this.releaseBox = function()
		{
			this.box = null;
		}
		
		this.updateBox = function()
		{
			var boxUpdated = false;
			
			if (this.hasBox())
			{
				boxUpdated = (this.box.x != this.x) || (this.box.y != this.y);
				
				this.box.x = this.x;
				this.box.y = this.y;
			}
			
			return boxUpdated;
		}
	}
	
	Subject.prototype.fillColor   = '#00A064';
	Subject.prototype.borderColor = '#828282';
	Subject.prototype.borderWidth = 0.1;
	Subject.prototype.arrowColor  = '#FFFFFF';
	
	var Direction =
	{
		UP:    "UP",
		DOWN:  "DOWN",
		LEFT:  "LEFT",
		RIGHT: "RIGHT"
	};
	
	function Portal(color)
	{
		this.x         = -1;
		this.y         = -1;
		this.direction = null;
		this.color     = color;
		
		this.isActivated = function()
		{
			return (this.x != -1) && (this.y != -1);
		}
		
		this.set = function(x, y, directionX, directionY)
		{
			this.x = x;
			this.y = y;
			
			if (directionX > 0)
			{
				this.direction = Direction.RIGHT;
			}
			else if (directionX < 0)
			{
				this.direction = Direction.LEFT;
			}
			else if (directionY > 0)
			{
				this.direction = Direction.UP;
			}
			else if (directionY < 0)
			{
				this.direction = Direction.DOWN;
			}
		}
		
		this.getExitPosition = function()
		{
			var result = {};
			result.x   = this.x;
			result.y   = this.y;
			
			switch (this.direction)
			{
				case Direction.UP:
					result.y++;
					break;
				
				case Direction.DOWN:
					result.y--;
					break;
					
				case Direction.LEFT:
					result.x--;
					break;
					
				case Direction.RIGHT:
					result.x++;
					break;
			}
			
			result.direction = this.direction;
			
			return result;
		}
		
		this.clear = function()
		{
			this.x = -1;
			this.y = -1;
			this.direction = null;
		}
		
		this.isIn = function(x, y)
		{
			return (this.x == x) && (this.y == y);
		}
		
		this.isInExit = function(x, y)
		{
			var exitPosition = this.getExitPosition();
			
			return (exitPosition.x == x) && (exitPosition.y == y);
		}
	}
	
	Portal.BLUE =
	{
		fillColor:   '#288CDC',
		borderColor: '#227ABF',
		borderWidth: 1
	};
	
	Portal.ORANGE =
	{
		fillColor:   '#FFA01E',
		borderColor: '#D18011',
		borderWidth: 1
	};
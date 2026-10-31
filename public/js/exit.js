	
	function Exit(data)
	{
		this.id = data.id;
		this.x  = data.x;
		this.y  = data.y;
		this.blocked = (data.hasOwnProperty('blocked')) ? data.blocked : true;
		
		this.isActivated = function()
		{
			return (this.blocked);
		}
		
		this.activate = function()
		{
			if (this.blocked)
			{
				Sound.DOOR_OPEN.play();
				this.blocked = false;
			}
		}
		
		this.deactivate = function()
		{
			if (!this.blocked)
			{
				Sound.DOOR_CLOSE.play();
				this.blocked = true;
			}
		}
		
		this.isIn = function(x, y)
		{
			return (this.x == x) && (this.y == y);
		}
	}
	
	Exit.prototype.fillColor   = '#A35087';
	Exit.prototype.borderColor = '#B304B3';
	Exit.prototype.borderWidth = 0.1;
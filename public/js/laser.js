	
	function Laser(data)
	{
		this.id = data.id;
		this.x  = data.x;
		this.y  = data.y;
		this.direction = data.direction;
		this.blocked   = (data.hasOwnProperty('blocked')) ? data.blocked : true;
		
		this.isActivated = function()
		{
			return (this.blocked);
		}
		
		this.activate = function()
		{
			if (this.blocked)
			{
				this.blocked = false;
			}
		}
		
		this.deactivate = function()
		{
			if (!this.blocked)
			{
				this.blocked = true;
			}
		}
	}
	
	Laser.prototype.fillColor   = '#FC1996';
	Laser.prototype.borderColor = '#FC1996';
	Laser.prototype.borderWidth = 0;
	Laser.prototype.widthRatio  = 6;
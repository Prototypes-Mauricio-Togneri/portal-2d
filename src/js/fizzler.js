	
	function Fizzler(data)
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
			this.blocked = false;
		}
		
		this.deactivate = function()
		{
			this.blocked = true;
		}
	}
	
	Fizzler.prototype.fillColor   = '#687DB3';
	Fizzler.prototype.borderColor = '#4949E3';
	Fizzler.prototype.borderWidth = 0.1;
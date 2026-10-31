	
	function Chamber(data)
	{
		this.id        = data.id;
		this.width     = data.size.width;
		this.height    = data.size.height;
		this.gateway   = null;
		
		this.links   = [];
		this.tileMap = [];
		
		this.getListElements = function(list, func)
		{
			var result = [];
			
			for (var i = 0; i < list.length; i++)
			{
				var element = list[i];
				
				if (element.hasOwnProperty('x') && element.hasOwnProperty('y'))
				{
					var tile = new func(element.x, element.y);
					result.push(tile);
				}
				else
				{
					for (var x = element.xFrom; x <= element.xTo; x++)
					{
						for (var y = element.yFrom; y <= element.yTo; y++)
						{
							var tile = new func(x, y);
							result.push(tile);
						}
					}
				}
			}
			
			return result;
		}
		
		this.getGenericElements = function(list, func)
		{
			var result = [];
			
			for (var i = 0; i < list.length; i++)
			{
				var element = new func(list[i], this);
				result.push(element);
				
				this.addLinkElement(element);
			}
			
			return result;
		}
		
		this.addLinkElement = function(element)
		{
			if (element.id)
			{
				this.links[element.id] = element;
			}
		}
		
		this.addTiles = function(list)
		{
			for (var i = 0; i < list.length; i++)
			{
				this.addTile(list[i]);
			}
		}
		
		this.addTile = function(tile)
		{	
			var x = tile.x;
			var y = tile.y;
			
			if ((this.tileMap[x]) && (this.tileMap[x][y]))
			{
				alert("Tile duplicated at: " + x + ", " + y);
			}
			
			if (this.tileMap[x])
			{
				this.tileMap[x][y] = tile;
			}
			else
			{
				var row = [];
				row[y] = tile;
				this.tileMap[x] = row;
			}
		}
		
		this.getTile = function(x, y)
		{
			if ((this.tileMap[x]) && (this.tileMap[x][y]))
			{
				return this.tileMap[x][y];
			}
			else
			{
				return null;
			}
		}
		
		this.getGenericElement = function(x, y, list)
		{
			var result = null;
			
			for (var i = 0; i < list.length; i++)
			{
				var element = list[i];
				
				if ((element.x == x) && (element.y == y))
				{
					result = element;
					break;
				}
			}
			
			return result;
		}
		
		this.getBox = function(x, y)
		{
			return this.getGenericElement(x, y, this.boxes);
		}
		
		this.getButton = function(x, y)
		{
			return this.getGenericElement(x, y, this.buttons);
		}
		
		this.getArrow = function(x, y)
		{
			return this.getGenericElement(x, y, this.arrows);
		}
		
		this.getFizzler = function(x, y)
		{
			return this.getGenericElement(x, y, this.fizzlers);
		}
		
		this.getDoor = function(x, y)
		{
			return this.getGenericElement(x, y, this.doors);
		}
		
		this.getDitch = function(x, y)
		{
			return this.getGenericElement(x, y, this.ditches);
		}
		
		this.getBarrier = function(x, y)
		{
			return this.getGenericElement(x, y, this.barriers);
		}
		
		this.getSwitch = function(x, y)
		{
			return this.getGenericElement(x, y, this.switches);
		}
		
		this.getLaser = function(x, y)
		{
			return this.getGenericElement(x, y, this.lasers);
		}
		
		this.getExit = function(x, y)
		{
			return this.exit.isIn(x, y) ? this.exit : null;
		}
		
		this.activate = function(links)
		{
			for (var i = 0; i < links.length; i++)
			{
				var id = links[i];
				var element = this.links[id];
				
				if (element)
				{
					element.activate();
				}
			}
		}
		
		this.deactivate = function(links)
		{
			for (var i = 0; i < links.length; i++)
			{
				var id = links[i];
				var element = this.links[id];
				
				if (element)
				{
					element.deactivate();
					
					if (element instanceof Barrier)
					{
						this.gateway.clearPortalAt(element.x, element.y);
					}
				}
			}
		}
		
		this.setGateway = function(gateway)
		{
			this.gateway = gateway;
		}
		
		this.walls = this.getListElements(data.walls, Wall);
		
		this.barriers = this.getGenericElements(data.barriers, Barrier);
		this.ditches  = this.getGenericElements(data.ditches,  Ditch);
		this.boxes    = this.getGenericElements(data.boxes,    Box);
		this.buttons  = this.getGenericElements(data.buttons,  Button);
		this.arrows   = this.getGenericElements(data.arrows,   Arrow);
		this.fizzlers = this.getGenericElements(data.fizzlers, Fizzler);
		this.doors    = this.getGenericElements(data.doors,    Door);
		this.switches = this.getGenericElements(data.switches, Switch);
		this.lasers   = this.getGenericElements(data.lasers,   Laser);
		
		this.exit = new Exit(data.exit);
		this.addLinkElement(this.exit);
		
		this.addTiles(this.walls);
	}
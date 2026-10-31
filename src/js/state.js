	
	function State(chamber, subject)
	{
		this.chamber = chamber;
		this.subject = subject;
		this.gateway = new Gateway();
		
		this.insideFizzler    = false;
		this.chamberCompleted = false;
		
		this.chamber.setGateway(this.gateway);
		
		this.update = function(delta, input)
		{
			var stateUpdated = false;
			
			this.checkExit();
			
			stateUpdated |= this.updateSubjectPosition(input);
			stateUpdated |= this.checkButtons();
			stateUpdated |= this.checkShootPortal(input);
			stateUpdated |= this.checkInteract(input);
			stateUpdated |= this.subject.updateBox();
			
			return stateUpdated;
		}
		
		this.checkButtons = function()
		{
			var buttonsUpdated = false;
			
			for (var i = 0; i < this.chamber.buttons.length; i++)
			{
				var button = this.chamber.buttons[i];
				var box    = this.chamber.getBox(button.x, button.y);
				
				if (box || button.isIn(this.subject.x, this.subject.y))
				{
					buttonsUpdated |= button.activate();
				}
				else
				{
					buttonsUpdated |= button.deactivate();
				}
			}
			
			return buttonsUpdated;
		}
		
		this.checkInteract = function(input)
		{
			var interacted = false;
			
			if (input.isPressed(Input.SPACE))
			{
				var switchElement = this.chamber.getSwitch(subject.x, subject.y);
				
				if (switchElement)
				{
					if (this.subject.hasBox())
					{
						Sound.ERROR.play();
					}
					else
					{
						switchElement.activate();
						interacted = true;
					}
				}
				else if (this.subject.hasBox())
				{
					this.subject.releaseBox();
					interacted = true;
				}
				else
				{
					var box = this.chamber.getBox(subject.x, subject.y);
					
					if (box)
					{
						this.subject.setBox(box);
						Sound.BOX.play();
						interacted = true;
					}
				}
			}
			
			return interacted;
		}
		
		this.checkShootPortal = function(input)
		{
			var portalCreated = false;
			var fizzler = this.chamber.getFizzler(subject.x, subject.y);
			
			if ((!fizzler) || (!fizzler.isActivated()))
			{
				if (input.isPressed(Input.KEY_A))
				{
					portalCreated = this.shootPortal(Portal.BLUE);
				}
				else if (input.isPressed(Input.KEY_D))
				{
					portalCreated = this.shootPortal(Portal.ORANGE);
				}
			}
			
			return portalCreated;
		}
		
		this.shootPortal = function(portalType)
		{
			var portalCreated = false;
			
			var pointingDirection = this.subject.getPointingDirection();
			var wall = this.getCollisionWall(subject.x, subject.y, pointingDirection.x, pointingDirection.y, this.subject.direction);
			
			if (wall != null)
			{
				switch (portalType)
				{
					case Portal.BLUE:
						this.gateway.blue.set(wall.x, wall.y, pointingDirection.x * -1, pointingDirection.y * -1);
						Sound.PORTAL_BLUE.play();
						portalCreated = true;
						break;
						
					case Portal.ORANGE:
						this.gateway.orange.set(wall.x, wall.y, pointingDirection.x * -1, pointingDirection.y * -1);
						Sound.PORTAL_ORANGE.play();
						portalCreated = true;
						break;
				}
			}
			else
			{
				Sound.ERROR.play();
			}
			
			return portalCreated;
		}
		
		this.getCollisionWall = function(x, y, directionX, directionY, direction)
		{
			var result = null;
			
			while ((result == null) && (x >= 0) && (y >= 0) && (x < this.chamber.width) && (y < this.chamber.height))
			{
				x += directionX;
				y += directionY;
				
				var tile    = this.chamber.getTile(x, y);
				var fizzler = this.chamber.getFizzler(x, y);
				var door    = this.chamber.getDoor(x, y);
				var barrier = this.chamber.getBarrier(x, y);
				var exit    = this.chamber.getExit(x, y);
				
				if (fizzler && (fizzler.isActivated()))
				{
					break;
				}
				
				if (barrier && (barrier.isActivated()))
				{
					break;
				}
				
				if (door && (door.isActivated()))
				{
					break;
				}
				
				if (exit && (exit.isActivated()))
				{
					break;
				}
				
				if (tile instanceof Wall)
				{
					var barrier = this.chamber.getBarrier(x, y);
					
					if ((!barrier) || (!barrier.isActivated()))
					{
						if ((!this.gateway.blue.isIn(tile.x, tile.y)) || (direction == this.gateway.blue.direction))
						{
							if ((!this.gateway.orange.isIn(tile.x, tile.y)) || (direction == this.gateway.orange.direction))
							{
								result = tile;	
							}
						}
					}
					
					break;
				}
			}
			
			return result;
		}
		
		this.getNewPosition = function(subject, input)
		{
			var newX = subject.x;
			var newY = subject.y;
			var newDirection = subject.direction;
			var arrow = this.chamber.getArrow(subject.x, subject.y);
			
			if (input.isPressed(Input.UP))
			{
				if ((!arrow) || (arrow.direction == Direction.UP))
				{
					if ((subject.direction == Direction.UP) || (!Input.isPressing(Input.CTRL)))
					{
						newY++;
					}
					
					newDirection = Direction.UP;
				}
			}
			else if (input.isPressed(Input.DOWN))
			{
				if ((!arrow) || (arrow.direction == Direction.DOWN))
				{
					if ((subject.direction == Direction.DOWN) || (!Input.isPressing(Input.CTRL)))
					{
						newY--;
					}
					
					newDirection = Direction.DOWN;
				}
			}
			else if (input.isPressed(Input.LEFT))
			{
				if ((!arrow) || (arrow.direction == Direction.LEFT))
				{
					if ((subject.direction == Direction.LEFT) || (!Input.isPressing(Input.CTRL)))
					{
						newX--;
					}
					
					newDirection = Direction.LEFT;
				}
			}
			else if (input.isPressed(Input.RIGHT))
			{
				if ((!arrow) || (arrow.direction == Direction.RIGHT))
				{
					if ((subject.direction == Direction.RIGHT) || (!Input.isPressing(Input.CTRL)))
					{
						newX++;
					}
					
					newDirection = Direction.RIGHT;
				}
			}
			
			var result = {};
			result.x = newX;
			result.y = newY;
			result.direction = newDirection;
			
			return result;
		}
		
		this.updateSubjectPosition = function(input)
		{
			var newPosition = this.getNewPosition(this.subject, input);
			var newX = newPosition.x;
			var newY = newPosition.y;
			var newDirection = newPosition.direction;
			
			var positionUpdated = (this.subject.x != newX) || (this.subject.y != newY) || (this.subject.direction != newDirection);
			
			this.subject.direction = newDirection;
			
			var targetTile = this.chamber.getTile(newX, newY);
			
			if (targetTile == null)
			{
				var barrier = this.chamber.getBarrier(newX, newY);
				var arrow   = this.chamber.getArrow(newX, newY);
				var door    = this.chamber.getDoor(newX, newY);
				var ditch   = this.chamber.getDitch(newX, newY);
				var laser   = this.chamber.getLaser(newX, newY);
				var exit    = this.chamber.getExit(newX, newY);
				
				if ((!barrier) || (!barrier.isActivated()))
				{
					if ((!door) || (!door.isActivated()))
					{
						if ((!exit) || (!exit.isActivated()))
						{
							if ((!ditch) || (!ditch.isActivated()))
							{
								if ((!laser) || (!laser.isActivated()))
								{
									if (arrow)
									{
										if (this.subject.direction == arrow.direction)
										{
											this.moveSubject(newX, newY);
										}
									}
									else
									{
										this.moveSubject(newX, newY);
									}
								}
							}
						}
					}
				}
			}
			else if (targetTile instanceof Wall)
			{
				if (this.gateway.blue.isActivated() && this.gateway.orange.isActivated())
				{
					if (this.gateway.blue.isIn(targetTile.x, targetTile.y) && this.gateway.blue.isInExit(this.subject.x, this.subject.y))
					{
						this.exitPortal(this.gateway.orange);
						positionUpdated = true;
					}
					else if (this.gateway.orange.isIn(targetTile.x, targetTile.y) && this.gateway.orange.isInExit(this.subject.x, this.subject.y))
					{
						this.exitPortal(this.gateway.blue);
						positionUpdated = true;
					}
				}
			}
			
			return positionUpdated;
		}
		
		this.moveSubject = function(x, y)
		{
			this.subject.x = x;
			this.subject.y = y;
			
			var fizzler = this.chamber.getFizzler(x, y);
			
			if (fizzler && fizzler.isActivated() && (!this.insideFizzler))
			{
				this.gateway.clear();
				
				this.insideFizzler = true;
				Sound.FIZZLER.play();
				
				if (this.subject.hasBox())
				{
					this.subject.destroyBox();
				}
			}
			
			if ((!fizzler) && (this.insideFizzler))
			{
				this.insideFizzler = false;
			}
		}
		
		this.exitPortal = function(portal)
		{
			var exitPosition = portal.getExitPosition();
						
			this.subject.x = exitPosition.x;
			this.subject.y = exitPosition.y;
			this.subject.direction = exitPosition.direction;
			
			Sound.CROSS.play();
		}
		
		this.checkExit = function()
		{
			if ((!this.chamberCompleted) && (this.chamber.getExit(this.subject.x, this.subject.y)))
			{
				this.chamberCompleted = true;
				alert('Chamber completed!');
			}
		}
	}
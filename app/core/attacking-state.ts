import Player from "../models/colyseus-models/player"
import { IProjectileEvent, Transfer } from "../types"
import delays from "../types/delays.json"
import { FPS_POKEMON_ANIMS, PokemonActionState } from "../types/enum/Game"
import { Item } from "../types/enum/Item"
import { Weather } from "../types/enum/Weather"
import { distanceC } from "../utils/distance"
import { chance } from "../utils/random"
import { AbilityStrategies } from "./abilities/abilities"
import Board from "./board"
import { PokemonEntity } from "./pokemon-entity"
import PokemonState from "./pokemon-state"
import { AttackCommand } from "./simulation-command"

export default class AttackingState extends PokemonState {
  update(
    pokemon: PokemonEntity,
    dt: number,
    board: Board,
    weather: Weather,
    player: Player
  ) {
    super.update(pokemon, dt, board, weather, player)

    if (pokemon.cooldown <= 0) {
      pokemon.cooldown = pokemon.getAttackDelay()

      // first, try to hit the same target than previous attack
      let target = board.getValue(pokemon.targetX, pokemon.targetY)
      let targetCoordinate: { x: number; y: number } | undefined = {
        x: pokemon.targetX,
        y: pokemon.targetY
      }

      if (pokemon.status.confusion) {
        targetCoordinate = this.getTargetCoordinateWhenConfused(pokemon, board)
      } else if (
        !(
          target &&
          target.team !== pokemon.team &&
          target.isTargettable &&
          distanceC(
            pokemon.positionX,
            pokemon.positionY,
            targetCoordinate.x,
            targetCoordinate.y
          ) <= pokemon.range
        )
      ) {
        // if target is no longer alive or at range, retargeting
        targetCoordinate = this.getNearestTargetAtRangeCoordinates(
          pokemon,
          board
        )
        if (targetCoordinate) {
          target = board.getValue(targetCoordinate.x, targetCoordinate.y)
        }
      }

      // no target at range, changing to moving state
      if (!target || !targetCoordinate || pokemon.status.charm) {
        const targetAtSight = this.getNearestTargetAtSightCoordinates(
          pokemon,
          board
        )
        if (targetAtSight) {
          pokemon.toMovingState()
        }
      } else if (
        target &&
        pokemon.pp >= pokemon.maxPP &&
        !pokemon.status.silence
      ) {
        // CAST ABILITY
        let crit = false
        if (pokemon.items.has(Item.REAPER_CLOTH)) {
          crit = chance(pokemon.critChance / 100)
        }
        AbilityStrategies[pokemon.skill].process(
          pokemon,
          this,
          board,
          target,
          crit
        )
      } else {
        // BASIC ATTACK
        pokemon.count.attackCount++
        const animationDuration =
          delays[pokemon.index].t * (1000 / FPS_POKEMON_ANIMS)
        const attackDuration = 1000 / pokemon.atkSpeed
        const hitDuration = delays[pokemon.index].d * (1000 / FPS_POKEMON_ANIMS)
        const timeScale =
          animationDuration > attackDuration
            ? animationDuration / attackDuration
            : 1
        const delay = hitDuration / timeScale || 200
        pokemon.simulation.room.broadcast(Transfer.PROJECTILE_EVENT, {
          pokemonId: pokemon.id,
          simulationId: pokemon.simulation.id,
          targetX: targetCoordinate.x,
          targetY: targetCoordinate.y,
          delay: delay
        } as IProjectileEvent)
        pokemon.commands.push(
          new AttackCommand(delay, pokemon, board, targetCoordinate)
        )
      }
    } else {
      pokemon.cooldown = Math.max(0, pokemon.cooldown - dt)
    }
  }

  onEnter(pokemon) {
    super.onEnter(pokemon)
    pokemon.action = PokemonActionState.ATTACK
    pokemon.cooldown = 0
  }

  onExit(pokemon) {
    super.onExit(pokemon)
    pokemon.targetX = -1
    pokemon.targetY = -1
  }
}

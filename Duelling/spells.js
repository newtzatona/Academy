const spells = {

    attacking: {

        Expelruamus: { mpCost: 10, effect: { hp: 0, mp: 5, text: 'Cancels defensive or active effect, +5 MP' } },

        Depulso: { mpCost: 15, effect: { hp: -10, mp: -5, text: '-10 HP, -5 MP opponent' } },

        Confringo: { mpCost: 25, effect: { hp: -15, burn: 5, burnTurns: 3, mp: -10, text: '-15 HP, Burn 5 HP for 3 turns, -10 MP opponent' } },

        Stupefy: { mpCost: 20, effect: { hp: -5, skip: 1, mp: 10, text: '-5 HP, Opponent skips next turn, +10 MP' } },

        Bombarda: { mpCost: 30, effect: { hp: -20, mp: -15, text: '-20 HP, -15 MP opponent' } },

        Immobulus: { mpCost: 20, effect: { hp: -5, immobilize: 2, mp: 10, text: '-5 HP, Opponent immobilized for 2 turns, +10 MP' } },

        Flipendo: { mpCost: 15, effect: { hp: -10, attackBlock: 1, text: '-10 HP, Opponent can’t attack next turn' } },

        PetrificusTotalus: { mpCost: 20, effect: { hp: 0, immobilize: 2, mp: -10, text: 'Opponent immobilized for 2 turns, -10 MP opponent' } },

        Expulso: { mpCost: 25, effect: { hp: -15, mp: 5, text: '-15 HP, +5 MP' } },

        Reducto: { mpCost: 30, effect: { hp: -20, mp: -10, text: '-20 HP, -10 MP opponent' } },

        LocomotorMortis: { mpCost: 10, effect: { hp: 0, immobilize: 1, mp: 5, text: 'Opponent immobilized for 1 turn, +5 MP' } },


    },

    defense: {

        Impedimenta: { mpCost: 15, effect: { hp: -5, attackReduce: 50, mp: 5, text: '-5 HP, Opponent’s attack reduced by 50% next turn, +5 MP' } },

        Protego: { mpCost: 20, effect: { block: 15, text: 'Blocks 15 HP of damage' } },

        RevulsionJinx: { mpCost: 10, effect: { heal: 0, statusCure: 1, mp: 5, text: 'Removes one negative status effect, +5 MP' } },

        CaveInimicum: { mpCost: 25, effect: { block: 20, mp: 10, text: 'Blocks 20 HP of damage, +10 MP' } },

        ImperturbableCharm: { mpCost: 15, effect: { statusBlock: 3, mp: -5, text: 'Blocks status effects for 3 turns, -5 MP opponent' } },

        ProtegoHorribilis: { mpCost: 30, effect: { block: 25, mp: -10, text: 'Blocks 25 HP of damage, -10 MP opponent' } },

        ProtegoTotalum: { mpCost: 25, effect: { block: 20, statusBlock: 1, text: 'Blocks 20 HP and status effects' } },

        SalvioHexia: { mpCost: 20, effect: { block: 15, statusReduce: 50, mp: 5, text: 'Blocks 15 HP and reduces status effects by 50%, +5 MP' } },

    },

    healing: {

        Episky: { mpCost: 0, effect: { heal: 10, mp: 5, text: 'Heals 10 HP, +5 MP' } },

        Ferula: { mpCost: 20, effect: { heal: 15, mp: -5, text: 'Heals 15 HP, -5 MP opponent' } },

        VulneraSanentur: { mpCost: 25, effect: { heal: 20, statusCure: 1, mp: 10, text: 'Heals 20 HP and removes one status effect, +10 MP' } },

        Reparifars: { mpCost: 20, effect: { heal: 10, statusCure: 2, mp: -5, text: 'Heals 10 HP and removes two status effects, -5 MP opponent' } },

    },

    darkArts: {

        BatBogeyHex: { mpCost: 20, effect: { hp: -10, bleed: 5, bleedTurns: 2, mp: -5, text: '-10 HP, 5 HP bleed for 2 turns, -5 MP opponent' } },

        CurseOfTheBogies: { mpCost: 25, effect: { hp: -15, blockDisable: 2, mp: 5, text: '-15 HP, Opponent can’t use defensive spells for 2 turns, +5 MP' } },

        JellyBrainJinx: { mpCost: 20, effect: { hp: -5, attackDisable: 2, mp: -5, text: '-5 HP, Opponent can’t use attacking spells for 2 turns, -5 MP opponent' } },

        JellyFingersJinx: { mpCost: 15, effect: { hp: -5, accuracyReduce: 50, text: '-5 HP, Opponent’s spell accuracy reduced by 50% for 2 turns' } },

        PimpleJinx: { mpCost: 10, effect: { hp: -5, damageIncrease: 25, text: '-5 HP, Opponent’s attack spell damage increased by 25% next turn (affects opponent)' } },

    },

    transfiguration: {

        ArrowShootingSpell: { mpCost: 15, effect: { hp: -10, text: '-10 HP' } },

        EbubiloJinx: { mpCost: 20, effect: { hp: -5, blind: 2, text: '-5 HP, Opponent blinded for 2 turns (can’t attack)' } },

        FireRope: { mpCost: 25, effect: { hp: -15, burn: 5, burnTurns: 2, mp: -5, text: '-15 HP, 5 HP burn for 2 turns, -5 MP opponent' } },

        WhipSpell: { mpCost: 20, effect: { hp: -10, defenseBlock: 1, mp: 5, text: '-10 HP, Opponent can’t defend next turn, +5 MP' } },

        Serpensortia: { mpCost: 15, effect: { hp: 0, summon: 5, summonTurns: 3, text: 'Summons snake that deals 5 HP per turn for 3 turns' } },

        Melofers: { mpCost: 20, effect: { hp: 0, immobilize: 1, mp: -5, text: 'Turns opponent into fruit for 1 turn (immobilizes), -5 MP opponent' } },

        Obscure: { mpCost: 15, effect: { hp: -5, healDisable: 2, text: '-5 HP, Opponent can’t heal for 2 turns' } },

        IncarcerousSpell: { mpCost: 20, effect: { hp: 0, immobilize: 1, mp: 5, text: 'Immobilizes opponent for 1 turn, +5 MP' } },


    }

};

module.exports = spells
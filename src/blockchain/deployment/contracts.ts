// PrivaChain Smart Contract Definitions

export const MAIL_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnonymousMail",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["admin"],
      "properties": {
        "admin": {
          "type": "string",
          "description": "Admin address for contract management"
        },
        "pow_difficulty": {
          "type": "integer",
          "default": 4,
          "description": "Proof-of-work difficulty for spam prevention"
        },
        "max_email_size": {
          "type": "integer",
          "default": 1048576,
          "description": "Maximum email size in bytes (1MB)"
        }
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["send_mail"],
          "properties": {
            "send_mail": {
              "type": "object",
              "required": ["recipient_domain", "content_cid", "zk_proof"],
              "properties": {
                "recipient_domain": {"type": "string"},
                "content_cid": {"type": "string"},
                "zk_proof": {"type": "string"},
                "sender_alias": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["delete_mail"],
          "properties": {
            "delete_mail": {
              "type": "object",
              "required": ["mail_id"],
              "properties": {
                "mail_id": {"type": "string"}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["get_inbox"],
          "properties": {
            "get_inbox": {
              "type": "object",
              "required": ["domain"],
              "properties": {
                "domain": {"type": "string"},
                "limit": {"type": "integer", "default": 50},
                "start_after": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["validate_pow"],
          "properties": {
            "validate_pow": {
              "type": "object",
              "required": ["sender", "nonce"],
              "properties": {
                "sender": {"type": "string"},
                "nonce": {"type": "integer"}
              }
            }
          }
        }
      ]
    }
  }
}
`

export const DOMAIN_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnonymousDNS",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["admin"],
      "properties": {
        "admin": {"type": "string"},
        "registration_fee": {"type": "string", "default": "10000000"},
        "renewal_period": {"type": "integer", "default": 31536000}
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["register_domain"],
          "properties": {
            "register_domain": {
              "type": "object",
              "required": ["domain_name", "zk_proof", "public_key"],
              "properties": {
                "domain_name": {"type": "string"},
                "zk_proof": {"type": "string"},
                "public_key": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["renew_domain"],
          "properties": {
            "renew_domain": {
              "type": "object",
              "required": ["domain_name"],
              "properties": {
                "domain_name": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["update_public_key"],
          "properties": {
            "update_public_key": {
              "type": "object",
              "required": ["domain_name", "new_public_key", "zk_proof"],
              "properties": {
                "domain_name": {"type": "string"},
                "new_public_key": {"type": "string"},
                "zk_proof": {"type": "string"}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["get_domain"],
          "properties": {
            "get_domain": {
              "type": "object",
              "required": ["domain_name"],
              "properties": {
                "domain_name": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["is_registered"],
          "properties": {
            "is_registered": {
              "type": "object",
              "required": ["domain_name"],
              "properties": {
                "domain_name": {"type": "string"}
              }
            }
          }
        }
      ]
    }
  }
}
`

export const VIDEO_SIGNALING_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VideoSignaling",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["admin"],
      "properties": {
        "admin": {"type": "string"},
        "session_timeout": {"type": "integer", "default": 3600},
        "max_participants": {"type": "integer", "default": 50}
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["start_session"],
          "properties": {
            "start_session": {
              "type": "object",
              "required": ["receiver", "stun_turn_server"],
              "properties": {
                "receiver": {"type": "string"},
                "stun_turn_server": {"type": "string"},
                "quality": {"type": "string", "enum": ["HD", "SD", "LOW"]},
                "encrypted": {"type": "boolean", "default": true}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["end_session"],
          "properties": {
            "end_session": {
              "type": "object",
              "required": ["session_id"],
              "properties": {
                "session_id": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["join_session"],
          "properties": {
            "join_session": {
              "type": "object",
              "required": ["session_id"],
              "properties": {
                "session_id": {"type": "string"}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["get_session"],
          "properties": {
            "get_session": {
              "type": "object",
              "required": ["session_id"],
              "properties": {
                "session_id": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["get_active_sessions"],
          "properties": {
            "get_active_sessions": {
              "type": "object",
              "required": ["user"],
              "properties": {
                "user": {"type": "string"}
              }
            }
          }
        }
      ]
    }
  }
}
`

export const REWARDS_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VideoRewards",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["admin", "priv_token_address"],
      "properties": {
        "admin": {"type": "string"},
        "priv_token_address": {"type": "string"},
        "rate_per_mb": {"type": "string", "default": "1000"},
        "min_stake": {"type": "string", "default": "10000000000"}
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["pay_relay_node"],
          "properties": {
            "pay_relay_node": {
              "type": "object",
              "required": ["node_address", "data_amount"],
              "properties": {
                "node_address": {"type": "string"},
                "data_amount": {"type": "integer"},
                "session_proof": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["stake_node"],
          "properties": {
            "stake_node": {
              "type": "object",
              "required": ["amount"],
              "properties": {
                "amount": {"type": "string"},
                "node_metadata": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["claim_rewards"],
          "properties": {
            "claim_rewards": {
              "type": "object",
              "properties": {}
            }
          }
        },
        {
          "type": "object",
          "required": ["slash_node"],
          "properties": {
            "slash_node": {
              "type": "object",
              "required": ["node_address", "reason"],
              "properties": {
                "node_address": {"type": "string"},
                "reason": {"type": "string"},
                "evidence": {"type": "string"}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["get_rewards"],
          "properties": {
            "get_rewards": {
              "type": "object",
              "required": ["address"],
              "properties": {
                "address": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["get_node_info"],
          "properties": {
            "get_node_info": {
              "type": "object",
              "required": ["node_address"],
              "properties": {
                "node_address": {"type": "string"}
              }
            }
          }
        }
      ]
    }
  }
}
`

export const CONSENSUS_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ConsensusManager",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["admin"],
      "properties": {
        "admin": {"type": "string"},
        "min_stake": {"type": "string", "default": "100000000000"},
        "max_validators": {"type": "integer", "default": 100},
        "slash_percentage": {"type": "integer", "default": 5}
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["propose_block"],
          "properties": {
            "propose_block": {
              "type": "object",
              "required": ["block_hash", "zk_proof"],
              "properties": {
                "block_hash": {"type": "string"},
                "zk_proof": {"type": "string"},
                "transactions": {"type": "array"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["vote_block"],
          "properties": {
            "vote_block": {
              "type": "object",
              "required": ["block_hash", "vote"],
              "properties": {
                "block_hash": {"type": "string"},
                "vote": {"type": "boolean"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["register_validator"],
          "properties": {
            "register_validator": {
              "type": "object",
              "required": ["stake_amount", "validator_key"],
              "properties": {
                "stake_amount": {"type": "string"},
                "validator_key": {"type": "string"},
                "commission": {"type": "integer", "default": 10}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["get_validators"],
          "properties": {
            "get_validators": {
              "type": "object",
              "properties": {
                "limit": {"type": "integer", "default": 50}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["get_validator"],
          "properties": {
            "get_validator": {
              "type": "object",
              "required": ["address"],
              "properties": {
                "address": {"type": "string"}
              }
            }
          }
        }
      ]
    }
  }
}
`

export const ZK_ROLLUP_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ZKRollup",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["admin", "verifier_key"],
      "properties": {
        "admin": {"type": "string"},
        "verifier_key": {"type": "string"},
        "batch_size": {"type": "integer", "default": 100},
        "challenge_period": {"type": "integer", "default": 604800}
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["submit_batch"],
          "properties": {
            "submit_batch": {
              "type": "object",
              "required": ["merkle_root", "zk_proof", "public_inputs"],
              "properties": {
                "merkle_root": {"type": "string"},
                "zk_proof": {"type": "string"},
                "public_inputs": {"type": "array"},
                "transactions_count": {"type": "integer"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["challenge_batch"],
          "properties": {
            "challenge_batch": {
              "type": "object",
              "required": ["batch_id", "fraud_proof"],
              "properties": {
                "batch_id": {"type": "string"},
                "fraud_proof": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["finalize_batch"],
          "properties": {
            "finalize_batch": {
              "type": "object",
              "required": ["batch_id"],
              "properties": {
                "batch_id": {"type": "string"}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["get_batch"],
          "properties": {
            "get_batch": {
              "type": "object",
              "required": ["batch_id"],
              "properties": {
                "batch_id": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["get_state"],
          "properties": {
            "get_state": {
              "type": "object",
              "properties": {}
            }
          }
        }
      ]
    }
  }
}
`

export const PRIV_TOKEN_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PRIVToken",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["name", "symbol", "decimals", "initial_balances"],
      "properties": {
        "name": {"type": "string", "default": "PrivaChain Token"},
        "symbol": {"type": "string", "default": "PRIV"},
        "decimals": {"type": "integer", "default": 18},
        "initial_balances": {"type": "array"},
        "mint": {
          "type": "object",
          "properties": {
            "minter": {"type": "string"},
            "cap": {"type": "string"}
          }
        }
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["transfer"],
          "properties": {
            "transfer": {
              "type": "object",
              "required": ["recipient", "amount"],
              "properties": {
                "recipient": {"type": "string"},
                "amount": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["mint"],
          "properties": {
            "mint": {
              "type": "object",
              "required": ["recipient", "amount"],
              "properties": {
                "recipient": {"type": "string"},
                "amount": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["burn"],
          "properties": {
            "burn": {
              "type": "object",
              "required": ["amount"],
              "properties": {
                "amount": {"type": "string"}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["balance"],
          "properties": {
            "balance": {
              "type": "object",
              "required": ["address"],
              "properties": {
                "address": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["token_info"],
          "properties": {
            "token_info": {
              "type": "object",
              "properties": {}
            }
          }
        }
      ]
    }
  }
}
`

export const NFT_CONTRACT = `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PrivaChainNFT",
  "type": "object",
  "required": ["instantiate_msg"],
  "properties": {
    "instantiate_msg": {
      "type": "object",
      "required": ["name", "symbol", "minter"],
      "properties": {
        "name": {"type": "string", "default": "PrivaChain Identity NFT"},
        "symbol": {"type": "string", "default": "PRIV-ID"},
        "minter": {"type": "string"},
        "premium_price": {"type": "string", "default": "100000000"}
      }
    },
    "execute_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["mint_premium"],
          "properties": {
            "mint_premium": {
              "type": "object",
              "properties": {
                "metadata": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["mint_identity"],
          "properties": {
            "mint_identity": {
              "type": "object",
              "required": ["to", "token_id", "zk_proof"],
              "properties": {
                "to": {"type": "string"},
                "token_id": {"type": "string"},
                "zk_proof": {"type": "string"},
                "metadata": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["burn"],
          "properties": {
            "burn": {
              "type": "object",
              "required": ["token_id"],
              "properties": {
                "token_id": {"type": "string"}
              }
            }
          }
        }
      ]
    },
    "query_msg": {
      "oneOf": [
        {
          "type": "object",
          "required": ["owner_of"],
          "properties": {
            "owner_of": {
              "type": "object",
              "required": ["token_id"],
              "properties": {
                "token_id": {"type": "string"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["tokens"],
          "properties": {
            "tokens": {
              "type": "object",
              "required": ["owner"],
              "properties": {
                "owner": {"type": "string"},
                "limit": {"type": "integer", "default": 10}
              }
            }
          }
        }
      ]
    }
  }
}
`

export const CONTRACT_SCHEMAS = {
  mail: MAIL_CONTRACT,
  domain: DOMAIN_CONTRACT,
  videoSignaling: VIDEO_SIGNALING_CONTRACT,
  rewards: REWARDS_CONTRACT,
  consensus: CONSENSUS_CONTRACT,
  zkRollup: ZK_ROLLUP_CONTRACT,
  prvToken: PRIV_TOKEN_CONTRACT,
  nft: NFT_CONTRACT
}

export type ContractType = keyof typeof CONTRACT_SCHEMAS
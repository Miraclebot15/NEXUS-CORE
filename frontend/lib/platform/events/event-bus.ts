export interface PlatformEventMessage<T=unknown>{

  type:string

  timestamp:number

  payload:T

}

type Listener<T=unknown>=(
  event:PlatformEventMessage<T>
)=>void

export class EventBus{

  private readonly listeners=
    new Map<
      string,
      Set<Listener>
    >()

  on(

    type:string,

    listener:Listener

  ){

    if(
      !this.listeners.has(type)
    ){

      this.listeners.set(
        type,
        new Set()
      )

    }

    this.listeners
      .get(type)!
      .add(listener)

  }

  off(

    type:string,

    listener:Listener

  ){

    this.listeners
      .get(type)
      ?.delete(listener)

  }

  emit<T>(

    type:string,

    payload:T

  ){

    const event:PlatformEventMessage<T>={

      type,

      timestamp:Date.now(),

      payload,

    }

    this.listeners
      .get(type)
      ?.forEach(listener=>
        listener(event)
      )

  }

  clear(){

    this.listeners.clear()

  }

}

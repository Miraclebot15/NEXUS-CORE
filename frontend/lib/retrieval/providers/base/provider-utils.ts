export interface ProviderRequestOptions {

  timeoutMs?: number

  retries?: number

}


export async function withRetry<T>(
  operation: () => Promise<T>,
  options: ProviderRequestOptions = {}
): Promise<T> {


  const retries =
    options.retries ?? 2


  let lastError: unknown



  for(
    let attempt = 0;
    attempt <= retries;
    attempt++
  ){

    try {

      return await operation()

    } catch(error){

      lastError = error

      if(
        attempt === retries
      ){
        break
      }

    }

  }


  throw lastError

}



export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = 10000
): Promise<T> {


  return Promise.race([

    operation,

    new Promise<T>((_, reject)=>{

      setTimeout(()=>{

        reject(
          new Error(
            "Provider request timeout"
          )
        )

      }, timeoutMs)

    })

  ])

}



export function normalizeText(
  text:string
):string {

  return text
    .trim()
    .replace(/\s+/g," ")

}

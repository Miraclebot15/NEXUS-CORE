export class QwenClient {

  constructor(
    private readonly apiKey:string,
    private readonly baseUrl:string
  ) {}


  async chat(
    input:string,
    model:string
  ){

    const response =
      await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method:"POST",

          headers:{
            "Content-Type":"application/json",
            "Authorization":
              `Bearer ${this.apiKey}`,
          },

          body:JSON.stringify({
            model,
            messages:[
              {
                role:"user",
                content:input
              }
            ]
          })
        }
      )


    if(!response.ok){

      throw new Error(
        `Qwen request failed: ${response.status}`
      )

    }


    return response.json()

  }

}

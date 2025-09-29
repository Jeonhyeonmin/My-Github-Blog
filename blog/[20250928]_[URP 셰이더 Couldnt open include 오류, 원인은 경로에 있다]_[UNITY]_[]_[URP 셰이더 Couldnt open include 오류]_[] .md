# URP 셰이더 Couldnt open include 오류 원인은 경로에 있다

URP 환경에서 셰이더를 다루다 보면 어김없이 마주치는 오류가 있다.  

> Shader error in ‘...’: Couldn’t open include file ‘Packages/com.unity-render-pipelines.universal/ShaderLibrary/Core.hlsl’.

분명 파일은 존재하는데 찾을 수 없다는 메시지는 개발자를 당황시키기에 충분하다.  
많은 이들이 임시방편으로 파일의 절대 경로를 코드에 명시하여 문제를 회피하곤 한다.  
하지만 이는 협업 시 반드시 문제를 일으키는 잘못된 해결책일 뿐이다.  

이 오류의 근본적인 원인은 아주 사소한 문자 하나의 차이에서 비롯된다.  

---

## 본질: 이것은 오타가 아닌, 규칙 위반이다

오류를 발생시키는 코드는 다음과 같다.

```csharp
// 잘못된 경로
#include "Packages/com.unity-render-pipelines.universal/ShaderLibrary/Core.hlsl"

// 올바른 경로
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
```

문제는 **unity-render** 와 **unity.render** 의 차이이다.  
이는 단순 오타가 아닌, **UPM(Unity Package Manager)의 패키지 명명 규칙(Naming Convention)** 을 위반한 명백한 오류이다.

- **점(.)**: 계층 구조를 정의하는 구분자(Separator)  
  - 예: `com.unity.core` → com 네임스페이스 아래 unity 네임스페이스에 속한 core 패키지  
- **하이픈(-)**: 이름의 일부를 구성하는 일반 문자  
  - 예: `com.unity-core` → unity-core라는 단일 패키지 이름  

따라서 `com.unity-render...` 경로는 존재하지 않는 패키지를 참조하게 되므로 오류가 발생한다.  

---

## 경로의 중요성: 왜 `Packages/` 인가?

절대 경로가 아닌 **Packages/** 상대 경로를 사용해야 하는 이유는 **이식성(Portability)** 과 **협업** 때문이다.  

Unity의 모든 패키지는 UPM에 의해 관리되며, 프로젝트의 Assets 폴더가 아닌 별도의 공용 캐시 폴더에 저장된다.  

```csharp
#include "Packages/..."
```

이 구문은 UPM에게  

> "현재 프로젝트에 연결된 공식 패키지 저장소에서 해당 파일을 찾아라"  

라고 지시하는 표준화된 약속이다.  

이 약속을 지킴으로써, 어떤 환경에서 프로젝트를 열든 UPM이 올바른 경로를 동적으로 찾아 연결해준다.  
이것이 팀 단위 개발 환경에서 **절대 경로 사용이 금기시되는 이유**이다.  

---

## 결론

결론적으로, `'Couldn't open include' 오류`는 셰이더 프로그래밍에 있어  
Unity의 패키지 시스템에 대한 이해가 얼마나 중요한지를 보여주는 단적인 예이다.  

---

## Ripple 효과 셰이더 예제

아래는 올바른 `#include` 사용법을 적용한 정상 작동하는 Ripple Effect Shader 코드이다.

```csharp
Shader "Custom/RippleEffectShader"
{
    Properties
    {
        [MainTexture] _BaseMap("Base Map", 2D) = "white" {}
        _Center("Ripple Center", Vector) = (0.5, 0.5, 0, 0)
        _WaveAmp("Wave Amplitude", Range(0, 0.1)) = 0.03
        _WaveFreq("Wave Frequency", Range(1, 50)) = 20
        _WaveSpeed("Wave Speed", Range(0, 5)) = 2
    }

    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue"="Transparent" }

        Pass
        {
            HLSLPROGRAM

            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float2 _Center;
                float _WaveAmp;
                float _WaveFreq;
                float _WaveSpeed;
            CBUFFER_END

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                float dist = distance(IN.uv, _Center);
                float wave = sin(dist * _WaveFreq - _Time.y * _WaveSpeed);
                float2 distortedUV = IN.uv + normalize(IN.uv - _Center) * wave * _WaveAmp * (1.0 - dist);
                half4 color = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, distortedUV);
                return color;
            }

            ENDHLSL
        }
    }
}
```

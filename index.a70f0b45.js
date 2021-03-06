var vertShader="#version 300 es\n#line 4\nlayout(location=0) in vec3 pos;\nuniform mat4 proj_view;\nuniform vec3 eye_pos;\nuniform vec3 volume_scale;\n\nout vec3 vray_dir;\nflat out vec3 transformed_eye;\n\nvoid main(void) {\n\t// TODO: For non-uniform size volumes we need to transform them differently as well\n\t// to center them properly\n\tvec3 volume_translation = vec3(0.5) - volume_scale * 0.5;\n\tgl_Position = proj_view * vec4(pos * volume_scale + volume_translation, 1);\n\ttransformed_eye = (eye_pos - volume_translation) / volume_scale;\n\tvray_dir = pos - transformed_eye;\n}",fragShader="#version 300 es\n#line 24\nprecision highp int;\nprecision highp float;\nuniform highp sampler3D volume;\nuniform highp sampler2D colormap;\nuniform highp sampler2D depth;\nuniform ivec3 volume_dims;\nuniform float dt_scale;\nuniform ivec2 canvas_dims;\nuniform vec3 volume_scale;\nuniform mat4 inv_view;\nuniform mat4 inv_proj;\n\nin vec3 vray_dir;\nflat in vec3 transformed_eye;\nout vec4 color;\n\nvec2 intersect_box(vec3 orig, vec3 dir) {\n\tconst vec3 box_min = vec3(0);\n\tconst vec3 box_max = vec3(1);\n\tvec3 inv_dir = 1.0 / dir;\n\tvec3 tmin_tmp = (box_min - orig) * inv_dir;\n\tvec3 tmax_tmp = (box_max - orig) * inv_dir;\n\tvec3 tmin = min(tmin_tmp, tmax_tmp);\n\tvec3 tmax = max(tmin_tmp, tmax_tmp);\n\tfloat t0 = max(tmin.x, max(tmin.y, tmin.z));\n\tfloat t1 = min(tmax.x, min(tmax.y, tmax.z));\n\treturn vec2(t0, t1);\n}\n\n// Pseudo-random number gen from\n// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/\n// with some tweaks for the range of values\nfloat wang_hash(int seed) {\n\tseed = (seed ^ 61) ^ (seed >> 16);\n\tseed *= 9;\n\tseed = seed ^ (seed >> 4);\n\tseed *= 0x27d4eb2d;\n\tseed = seed ^ (seed >> 15);\n\treturn float(seed % 2147483647) / float(2147483647);\n}\n\n// Linearize the depth value passed in\nfloat linearize(float d) {\n\tfloat near = 0.0;\n\tfloat far = 1.0;\n\treturn (2.f * d - near - far) / (far - near);\n}\n\n// Reconstruct the view-space position\nvec4 compute_view_pos(float z) {\n\t// TODO: We don't really care about the full view position here\n\tvec4 pos = vec4(gl_FragCoord.xy / vec2(canvas_dims) * 2.f - 1.f, z, 1.f);\n\tpos = inv_proj * pos;\n\treturn pos / pos.w;\n}\n\nvoid main(void) {\n\tvec3 ray_dir = normalize(vray_dir);\n\tvec2 t_hit = intersect_box(transformed_eye, ray_dir);\n\tif (t_hit.x > t_hit.y) {\n\t\tdiscard;\n\t}\n\tt_hit.x = max(t_hit.x, 0.0);\n\n\tvec3 dt_vec = 1.0 / (vec3(volume_dims) * abs(ray_dir));\n\tfloat dt = dt_scale * min(dt_vec.x, min(dt_vec.y, dt_vec.z));\n\tfloat dt_correction = dt_scale;\n\tfloat offset = wang_hash(int(gl_FragCoord.x + float(canvas_dims.x) * gl_FragCoord.y));\n\n\t// Composite with the rendered geometry\n\tfloat z = linearize(texelFetch(depth, ivec2(gl_FragCoord), 0).x);\n\tif (z < 1.0) {\n\t\tvec3 volume_translation = vec3(0.5) - volume_scale * 0.5;\n\t\tvec3 geom_pos = (inv_view * compute_view_pos(z)).xyz;\n\t\tgeom_pos = (geom_pos - volume_translation) / volume_scale;\n\t\tfloat geom_t = length(geom_pos - transformed_eye);\n\n\t\t// We want to adjust the sampling rate to still take a reasonable\n\t\t// number of samples in the volume up to the surface\n\t\tfloat samples = 1.f / dt;\n\t\tfloat newdt = (geom_t - t_hit.x) / samples;\n\t\tdt_correction = dt_scale * newdt / dt;\n\t\tdt = newdt;\n\t\tt_hit.y = geom_t;\n\t}\n\n\tvec3 p = transformed_eye + (t_hit.x + offset * dt) * ray_dir;\n\tfloat t;\n\tfor (t = t_hit.x; t < t_hit.y; t += dt) {\n\t\tfloat val = texture(volume, p).r;\n\t\tvec4 val_color = vec4(texture(colormap, vec2(val, 0.5)).rgb, val);\n\t\t// Opacity correction\n\t\tval_color.a = 1.0 - pow(1.0 - val_color.a, dt_correction);\n\t\tcolor.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;\n\t\tcolor.a += (1.0 - color.a) * val_color.a;\n\t\tif (color.a >= 0.99) {\n\t\t\tbreak;\n\t\t}\n\t\tp += ray_dir * dt;\n\t}\n\t// If we have the surface, take a final sample at the surface point\n\tif (z < 1.f) {\n\t\tp = transformed_eye + t_hit.y * ray_dir;\n\t\tfloat val = texture(volume, p).r;\n\t\tvec4 val_color = vec4(texture(colormap, vec2(val, 0.5)).rgb, val);\n\t\t// Opacity correction\n\t\tval_color.a = 1.0 - pow(1.0 - val_color.a, (t_hit.y - t) * dt_scale);\n\t\tcolor.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;\n\t\tcolor.a += (1.0 - color.a) * val_color.a;\n\t}\n}",isosurfaceVertShader="#version 300 es\n#line 119\nlayout(location=0) in vec3 pos;\nuniform mat4 proj_view;\nuniform vec3 eye_pos;\nuniform vec3 volume_scale;\nuniform ivec3 volume_dims;\n\nout vec3 vpos;\n\nvoid main(void) {\n\tvec3 volume_translation = vec3(0.5) - volume_scale * 0.5;\n\t// The isosurface vertices are in the volume grid space, so transform to [0, 1] first,\n\t// then apply the volume transform to line up with the volume\n\t// TODO: This should still be fine for computing the normal right?\n\tvpos = pos / vec3(volume_dims) * volume_scale + volume_translation;\n\tgl_Position = proj_view * vec4(vpos, 1.f);\n}",isosurfaceFragShader="#version 300 es\n#line 139\nprecision highp int;\nprecision highp float;\nuniform highp sampler2D colormap;\nuniform float isovalue;\nuniform vec3 eye_pos;\n\nin vec3 vpos;\n\nout vec4 color;\n\nvoid main(void) {\n\tvec3 v = -normalize(vpos - eye_pos);\n\t//vec3 light_dir = normalize(v + vec3(0.5, 0.5, 0.5));\n\tvec3 light_dir = v;\n\tvec3 n = normalize(cross(dFdx(vpos), dFdy(vpos)));\n\t//vec3 base_color = (n + 1.f) * 0.5f;\n\tvec3 base_color = texture(colormap, vec2(isovalue, 0.5)).xyz;\n\tvec3 h = normalize(v + light_dir);\n\t// Just some Blinn-Phong shading\n\tcolor.xyz = base_color * 0.2f;\n\tcolor.xyz += 0.6 * clamp(dot(light_dir, n), 0.f, 1.f) * base_color;\n\tcolor.xyz += 0.4 * pow(clamp(dot(n, h), 0.f, 1.f), 25.f);\n\n\tcolor.a = 1.0;\n}",quadVertShader="#version 300 es\n#line 162\nconst vec4 pos[4] = vec4[4](\n\tvec4(-1, 1, 0.5, 1),\n\tvec4(-1, -1, 0.5, 1),\n\tvec4(1, 1, 0.5, 1),\n\tvec4(1, -1, 0.5, 1)\n);\nvoid main(void){\n\tgl_Position = pos[gl_VertexID];\n}",quadFragShader="#version 300 es\n#line 175\nprecision highp int;\nprecision highp float;\n\nuniform sampler2D colors;\nout vec4 color;\n\nfloat linear_to_srgb(float x) {\n\tif (x <= 0.0031308f) {\n\t\treturn 12.92f * x;\n\t}\n\treturn 1.055f * pow(x, 1.f / 2.4f) - 0.055f;\n}\n\nvoid main(void){ \n\tivec2 uv = ivec2(gl_FragCoord.xy);\n\tcolor = texelFetch(colors, uv, 0);\n    color.r = linear_to_srgb(color.r);\n    color.g = linear_to_srgb(color.g);\n    color.b = linear_to_srgb(color.b);\n}";
//# sourceMappingURL=index.a70f0b45.js.map
